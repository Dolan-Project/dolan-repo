import { beforeEach, describe, expect, it } from "vitest";
import { handleLogoutRequest } from "@/lib/auth/handle-auth";
import { resetCommunityMocks } from "@/mocks/community-store";
import {
  handleAttemptJoinRequest,
  handleBlockRequest,
  handleConfirmAttendanceRequest,
  handleCreateReportRequest,
  handleCreateReviewRequest,
  handleFollowRequest,
  handleGetFollowersRequest,
  handleGetFollowingRequest,
  handleGetHistoryRequest,
  handleListOfflineItinerariesRequest,
  handleListReportsRequest,
  handleModerateReportRequest,
  handleSaveOfflineItineraryRequest,
  handleUnfollowRequest,
} from "./handle-community";

function authed(
  url: string,
  options: {
    method?: string;
    body?: unknown;
    cookie?: string;
  } = {},
) {
  const { method = "POST", body, cookie = "complete" } = options;
  return new Request(url, {
    method,
    headers: {
      cookie: `dolan_session=${cookie}`,
      ...(body !== undefined ? { "content-type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

async function json(response: Response) {
  return response.json() as Promise<{
    success: boolean;
    data?: Record<string, unknown>;
    error?: { code: string };
  }>;
}

beforeEach(() => {
  resetCommunityMocks();
});

describe("follow", () => {
  it("rejects self-follow", async () => {
    const response = await handleFollowRequest(authed("http://localhost/api/v1/users/salsa/follow"), "salsa");
    const body = await json(response);
    expect(body.success).toBe(false);
    expect(body.error?.code).toBe("SELF_FOLLOW");
  });

  it("follows, lists followers and following, then unfollows", async () => {
    const follow = await handleFollowRequest(authed("http://localhost/api/v1/users/wayan/follow"), "wayan");
    expect((await json(follow)).success).toBe(true);

    const followers = await json(
      await handleGetFollowersRequest(authed("http://localhost/api/v1/users/wayan/followers", { method: "GET" }), "wayan"),
    );
    expect((followers.data?.items as Array<{ username: string }>)[0]?.username).toBe("salsa");

    const following = await json(
      await handleGetFollowingRequest(authed("http://localhost/api/v1/users/salsa/following", { method: "GET" }), "salsa"),
    );
    expect((following.data?.items as Array<{ username: string }>)[0]?.username).toBe("wayan");

    const unfollow = await handleUnfollowRequest(
      authed("http://localhost/api/v1/users/wayan/follow", { method: "DELETE" }),
      "wayan",
    );
    expect((await json(unfollow)).success).toBe(true);
  });
});

describe("review", () => {
  it("rejects self-review", async () => {
    const response = await handleCreateReviewRequest(
      authed("http://localhost/api/v1/users/salsa/reviews", {
        body: { tripId: "trip_completed", communication: 5, attitude: 5 },
      }),
      "salsa",
    );
    const body = await json(response);
    expect(body.success).toBe(false);
    expect(body.error?.code).toBe("SELF_REVIEW");
  });

  it("rejects review when the pair did not complete a trip together", async () => {
    const response = await handleCreateReviewRequest(
      authed("http://localhost/api/v1/users/private_host/reviews", {
        body: { tripId: "trip_completed", communication: 4, attitude: 4 },
      }),
      "private_host",
    );
    const body = await json(response);
    expect(body.success).toBe(false);
    expect(body.error?.code).toBe("NOT_ELIGIBLE");
  });

  it("rejects duplicate review for the same completed trip", async () => {
    const first = await handleCreateReviewRequest(
      authed("http://localhost/api/v1/users/wayan/reviews", {
        body: { tripId: "trip_completed", communication: 5, attitude: 4 },
      }),
      "wayan",
    );
    expect((await json(first)).success).toBe(true);

    const second = await handleCreateReviewRequest(
      authed("http://localhost/api/v1/users/wayan/reviews", {
        body: { tripId: "trip_completed", communication: 3, attitude: 3 },
      }),
      "wayan",
    );
    const body = await json(second);
    expect(body.success).toBe(false);
    expect(body.error?.code).toBe("DUPLICATE_REVIEW");
  });
});

describe("block", () => {
  it("removes follow and prevents follow and join", async () => {
    await handleFollowRequest(authed("http://localhost/api/v1/users/wayan/follow"), "wayan");
    const blocked = await handleBlockRequest(authed("http://localhost/api/v1/users/wayan/block"), "wayan");
    expect((await json(blocked)).success).toBe(true);

    const followers = await json(
      await handleGetFollowersRequest(authed("http://localhost/api/v1/users/wayan/followers", { method: "GET" }), "wayan"),
    );
    expect((followers.data?.items as unknown[]).length).toBe(0);

    const followAgain = await json(
      await handleFollowRequest(authed("http://localhost/api/v1/users/wayan/follow"), "wayan"),
    );
    expect(followAgain.error?.code).toBe("BLOCKED_RELATION");

    const join = await json(
      await handleAttemptJoinRequest(authed("http://localhost/api/v1/trips/trip_open/join"), "trip_open"),
    );
    expect(join.error?.code).toBe("BLOCKED_RELATION");
  });
});

describe("public history", () => {
  it("only returns allowed public history", async () => {
    const wayan = await json(
      await handleGetHistoryRequest(
        authed("http://localhost/api/v1/users/wayan/history", { method: "GET" }),
        "wayan",
      ),
    );
    const wayanItems = wayan.data?.items as Array<{ title: string; visibility: string }>;
    expect(wayanItems.every((row) => row.visibility === "PUBLIC")).toBe(true);
    expect(wayanItems.some((row) => row.title.includes("Komodo"))).toBe(true);

    const hidden = await json(
      await handleGetHistoryRequest(
        authed("http://localhost/api/v1/users/private_host/history", { method: "GET" }),
        "private_host",
      ),
    );
    expect((hidden.data?.items as unknown[]).length).toBe(0);
  });
});

describe("attendance", () => {
  it("confirms attendance on a completed trip", async () => {
    const response = await handleConfirmAttendanceRequest(
      authed("http://localhost/api/v1/trips/trip_completed/attendance", {
        body: { confirmed: true },
      }),
      "trip_completed",
    );
    const body = await json(response);
    expect(body.success).toBe(true);
    expect(body.data?.confirmed).toBe(true);
  });
});

describe("reports", () => {
  it("creates a report and lets admin hide it", async () => {
    const created = await json(
      await handleCreateReportRequest(
        authed("http://localhost/api/v1/reports", {
          body: { targetType: "user", targetId: "user_wayan", reason: "spam" },
        }),
      ),
    );
    expect(created.success).toBe(true);
    const reportId = created.data?.id as string;

    const forbidden = await json(
      await handleListReportsRequest(authed("http://localhost/api/v1/admin/reports", { method: "GET" })),
    );
    expect(forbidden.error?.code).toBe("FORBIDDEN");

    const listed = await json(
      await handleListReportsRequest(
        authed("http://localhost/api/v1/admin/reports", { method: "GET", cookie: "admin" }),
      ),
    );
    expect((listed.data?.items as Array<{ id: string }>).some((row) => row.id === reportId)).toBe(true);

    const moderated = await json(
      await handleModerateReportRequest(
        authed(`http://localhost/api/v1/admin/reports/${reportId}/moderate`, {
          cookie: "admin",
          body: { action: "hide" },
        }),
        reportId,
      ),
    );
    expect(moderated.success).toBe(true);
    expect(moderated.data?.status).toBe("HIDDEN");
  });
});

describe("offline itinerary and logout", () => {
  it("only saves an itinerary the user explicitly chose", async () => {
    const rejected = await json(
      await handleSaveOfflineItineraryRequest(
        authed("http://localhost/api/v1/offline/itineraries", {
          body: { id: "explore", title: "Jelajah", path: "/jelajah" },
        }),
      ),
    );
    expect(rejected.error?.code).toBe("NOT_ELIGIBLE");

    const saved = await json(
      await handleSaveOfflineItineraryRequest(
        authed("http://localhost/api/v1/offline/itineraries", {
          body: {
            id: "bali-3h2m",
            title: "Trip ke Bali 3H2M",
            path: "/itinerary/bali-3h2m",
          },
        }),
      ),
    );
    expect(saved.success).toBe(true);

    const editor = await json(
      await handleSaveOfflineItineraryRequest(
        authed("http://localhost/api/v1/offline/itineraries", {
          body: {
            id: "trip_1",
            title: "Itinerary trip saya",
            path: "/trip-saya/trip_1/itinerary",
          },
        }),
      ),
    );
    expect(editor.success).toBe(true);
  });

  it("clears private offline itineraries on logout", async () => {
    await handleSaveOfflineItineraryRequest(
      authed("http://localhost/api/v1/offline/itineraries", {
        body: {
          id: "bali-3h2m",
          title: "Trip ke Bali 3H2M",
          path: "/itinerary/bali-3h2m",
        },
      }),
    );

    await handleLogoutRequest(authed("http://localhost/api/auth/logout"));

    const listed = await json(
      await handleListOfflineItinerariesRequest(
        authed("http://localhost/api/v1/offline/itineraries", { method: "GET" }),
      ),
    );
    expect((listed.data?.items as unknown[]).length).toBe(0);
  });
});
