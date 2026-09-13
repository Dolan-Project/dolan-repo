import { describe, expect, it } from "vitest";
import {
  handleCreateTripRequest,
  handleGetTripRequest,
  handleLeaveTripRequest,
  handleListMyTripsRequest,
  handlePublishTripRequest,
  handleTransitionTripRequest,
  handleUpdateTripRequest,
} from "./handle-trip";

function jsonRequest(url: string, body: unknown, cookie?: string) {
  return new Request(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  });
}

const draftBody = {
  path: "known",
  title: "Sailing Komodo 4D3N",
  origin: "Jakarta",
  destinationCity: "Labuan Bajo",
  startDate: "2026-10-24",
  endDate: "2026-10-27",
  transport: "Kapal Phinisi",
  planningPartySize: 4,
  budgetAmount: 2_000_000,
  budgetBasis: "PER_PERSON",
  visibility: "PUBLIC",
  maxParticipants: 7,
  meetingPoint: "Bandara Komodo (LBJ)",
};

describe("handleCreateTripRequest", () => {
  it("returns UNAUTHORIZED without a session", async () => {
    const response = await handleCreateTripRequest(
      jsonRequest("http://localhost/api/v1/trips", draftBody),
    );
    const json = (await response.json()) as { success: boolean };
    expect(json.success).toBe(false);
    expect(response.status).toBe(401);
  });

  it("saves a public-intent trip as draft, not open", async () => {
    const response = await handleCreateTripRequest(
      jsonRequest("http://localhost/api/v1/trips", draftBody, "dolan_session=complete"),
    );
    const json = (await response.json()) as {
      success: true;
      data: { status: string; visibility: string };
    };
    expect(json.success).toBe(true);
    expect(json.data.status).toBe("DRAFT");
    expect(json.data.visibility).toBe("PUBLIC");
  });

  it("returns the same trip when the idempotency key is reused", async () => {
    const key = "create-once";
    const headers = {
      "content-type": "application/json",
      cookie: "dolan_session=complete",
      "idempotency-key": key,
    };
    const first = await handleCreateTripRequest(
      new Request("http://localhost/api/v1/trips", {
        method: "POST",
        headers,
        body: JSON.stringify(draftBody),
      }),
    );
    const second = await handleCreateTripRequest(
      new Request("http://localhost/api/v1/trips", {
        method: "POST",
        headers,
        body: JSON.stringify(draftBody),
      }),
    );
    const a = (await first.json()) as { success: true; data: { id: string } };
    const b = (await second.json()) as { success: true; data: { id: string } };
    expect(a.data.id).toBe(b.data.id);
  });
});

describe("handlePublishTripRequest", () => {
  it("rejects publish without confirmation", async () => {
    const created = await handleCreateTripRequest(
      jsonRequest("http://localhost/api/v1/trips", draftBody, "dolan_session=complete"),
    );
    const trip = (await created.json()) as { success: true; data: { id: string } };
    const response = await handlePublishTripRequest(
      jsonRequest(
        `http://localhost/api/v1/trips/${trip.data.id}/publish`,
        { confirmPublish: false, visibility: "PUBLIC" },
        "dolan_session=complete",
      ),
      trip.data.id,
    );
    expect(response.status).toBe(400);
  });
});

describe("handleListMyTripsRequest", () => {
  it("does not treat pending applications as joined trips", async () => {
    const pending = await handleListMyTripsRequest(
      new Request("http://localhost/api/v1/trips/me?role=pending", {
        headers: { cookie: "dolan_session=complete" },
      }),
    );
    const joined = await handleListMyTripsRequest(
      new Request("http://localhost/api/v1/trips/me?role=joined", {
        headers: { cookie: "dolan_session=complete" },
      }),
    );
    const pendingJson = (await pending.json()) as {
      success: true;
      data: { id: string }[];
    };
    const joinedJson = (await joined.json()) as {
      success: true;
      data: { id: string }[];
    };
    const joinedIds = new Set(joinedJson.data.map((trip) => trip.id));
    expect(pendingJson.data.every((trip) => !joinedIds.has(trip.id))).toBe(true);
  });
});

describe("handleLeaveTripRequest", () => {
  it("does not allow a pending applicant to leave as a participant", async () => {
    const response = await handleLeaveTripRequest(
      jsonRequest(
        "http://localhost/api/v1/trips/trip_pending/leave",
        {},
        "dolan_session=complete",
      ),
      "trip_pending",
    );
    const json = (await response.json()) as {
      success: false;
      error: { code: string };
    };
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("NOT_MEMBER");
  });

  it("requires confirmLeave when leaving an ongoing trip", async () => {
    const denied = await handleLeaveTripRequest(
      jsonRequest(
        "http://localhost/api/v1/trips/trip_ongoing/leave",
        {},
        "dolan_session=complete",
      ),
      "trip_ongoing",
    );
    const deniedJson = (await denied.json()) as {
      success: false;
      error: { code: string };
    };
    expect(deniedJson.error.code).toBe("LEAVE_CONFIRM_REQUIRED");

    const allowed = await handleLeaveTripRequest(
      jsonRequest(
        "http://localhost/api/v1/trips/trip_ongoing/leave",
        { confirmLeave: true },
        "dolan_session=complete",
      ),
      "trip_ongoing",
    );
    const allowedJson = (await allowed.json()) as { success: boolean };
    expect(allowedJson.success).toBe(true);
  });
});

describe("handleUpdateTripRequest", () => {
  it("rejects capacity below active members", async () => {
    const response = await handleUpdateTripRequest(
      jsonRequest(
        "http://localhost/api/v1/trips/trip_1",
        {
          ...draftBody,
          title: "Jelajah Yogyakarta Diedit",
          destinationCity: "Yogyakarta",
          maxParticipants: 5,
        },
        "dolan_session=complete",
      ),
      "trip_1",
    );
    const json = (await response.json()) as {
      success: false;
      error: { code: string };
    };
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("CAPACITY_BELOW_MEMBERS");
  });

  it("lets the host update the title", async () => {
    const response = await handleUpdateTripRequest(
      jsonRequest(
        "http://localhost/api/v1/trips/trip_1",
        {
          ...draftBody,
          title: "Jelajah Malioboro",
          destinationCity: "Yogyakarta",
          maxParticipants: 6,
          meetingPoint: "Stasiun Tugu",
        },
        "dolan_session=complete",
      ),
      "trip_1",
    );
    const json = (await response.json()) as {
      success: true;
      data: { title: string };
    };
    expect(json.success).toBe(true);
    expect(json.data.title).toBe("Jelajah Malioboro");
  });
});

describe("handleGetTripRequest", () => {
  it("returns a public trip to visitors without a session", async () => {
    const response = await handleGetTripRequest(
      new Request("http://localhost/api/v1/trips/trip_1"),
      "trip_1",
    );
    const json = (await response.json()) as {
      success: true;
      data: {
        viewerRole: string;
        privateOriginLabel: string | null;
      };
    };
    expect(response.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.viewerRole).toBe("none");
    expect(json.data.privateOriginLabel).toBeNull();
  });

  it("does not leak a private trip to visitors", async () => {
    const response = await handleGetTripRequest(
      new Request("http://localhost/api/v1/trips/trip_private"),
      "trip_private",
    );
    const json = (await response.json()) as {
      success: false;
      error: { code: string };
    };
    expect(response.status).toBe(404);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("NOT_FOUND");
  });
});

describe("handleTransitionTripRequest", () => {
  it("reopens a closed trip to OPEN", async () => {
    await handleTransitionTripRequest(
      jsonRequest(
        "http://localhost/api/v1/trips/trip_1/transition",
        { action: "close" },
        "dolan_session=complete",
      ),
      "trip_1",
    );
    const response = await handleTransitionTripRequest(
      jsonRequest(
        "http://localhost/api/v1/trips/trip_1/transition",
        { action: "reopen" },
        "dolan_session=complete",
      ),
      "trip_1",
    );
    const json = (await response.json()) as {
      success: true;
      data: { status: string };
    };
    expect(json.success).toBe(true);
    expect(json.data.status).toBe("OPEN");
  });
});
