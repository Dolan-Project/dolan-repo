import { afterEach, describe, expect, it } from "vitest";
import {
  handleCreateCommentRequest,
  handleGetTripRequest,
  handleListCommentsRequest,
  handleListMessagesRequest,
  handleListNotificationsRequest,
  handleMarkNotificationReadRequest,
  handleRequestJoinRequest,
  handleReviewJoinRequest,
  handleSendMessageRequest,
  handleWithdrawJoinRequest,
  resetSocialMocks,
} from "./handle-social";

afterEach(() => {
  resetSocialMocks();
});

function cookie(value: string) {
  return { cookie: `dolan_session=${value}` };
}

describe("comments", () => {
  it("lets a visitor read comments without a session", async () => {
    const response = await handleListCommentsRequest(
      new Request("http://localhost/api/v1/trips/trip_1/comments"),
      "trip_1",
    );
    const json = (await response.json()) as {
      success: true;
      data: { body: string; parentId: string | null }[];
    };
    expect(json.success).toBe(true);
    expect(json.data.length).toBeGreaterThan(0);
    expect(json.data.some((row) => row.parentId === null)).toBe(true);
  });

  it("rejects guest comment writes", async () => {
    const response = await handleCreateCommentRequest(
      new Request("http://localhost/api/v1/trips/trip_1/comments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: "Halo" }),
      }),
      "trip_1",
    );
    const json = (await response.json()) as { error: { code: string } };
    expect(json.error.code).toBe("UNAUTHORIZED");
  });

  it("rejects unverified comment writes", async () => {
    const response = await handleCreateCommentRequest(
      new Request("http://localhost/api/v1/trips/trip_1/comments", {
        method: "POST",
        headers: { ...cookie("unverified"), "content-type": "application/json" },
        body: JSON.stringify({ body: "Halo" }),
      }),
      "trip_1",
    );
    const json = (await response.json()) as { error: { code: string } };
    expect(json.error.code).toBe("EMAIL_UNVERIFIED");
  });

  it("lets a pending applicant comment", async () => {
    await handleRequestJoinRequest(
      new Request("http://localhost/api/v1/trips/trip_open/join-requests", {
        method: "POST",
        headers: { ...cookie("complete"), "content-type": "application/json" },
        body: JSON.stringify({ message: "Ikut ya" }),
      }),
      "trip_open",
    );
    const response = await handleCreateCommentRequest(
      new Request("http://localhost/api/v1/trips/trip_open/comments", {
        method: "POST",
        headers: { ...cookie("complete"), "content-type": "application/json" },
        body: JSON.stringify({ body: "Pending tetap boleh komentar" }),
      }),
      "trip_open",
    );
    const json = (await response.json()) as { success: boolean };
    expect(json.success).toBe(true);
  });
});

describe("join", () => {
  it("creates a pending request labeled join-free without payment fields", async () => {
    const response = await handleRequestJoinRequest(
      new Request("http://localhost/api/v1/trips/trip_open/join-requests", {
        method: "POST",
        headers: { ...cookie("complete"), "content-type": "application/json" },
        body: JSON.stringify({ message: "Ikut ya" }),
      }),
      "trip_open",
    );
    const json = (await response.json()) as {
      success: true;
      data: Record<string, unknown>;
    };
    expect(json.success).toBe(true);
    expect(json.data.status).toBe("PENDING");
    expect("joinFee" in json.data).toBe(false);
    expect("checkout" in json.data).toBe(false);
  });

  it("shows the host decision to the applicant", async () => {
    const created = await handleRequestJoinRequest(
      new Request("http://localhost/api/v1/trips/trip_open/join-requests", {
        method: "POST",
        headers: { ...cookie("complete"), "content-type": "application/json" },
        body: JSON.stringify({}),
      }),
      "trip_open",
    );
    const createdJson = (await created.json()) as { data: { id: string } };
    await handleReviewJoinRequest(
      new Request("http://localhost/api/v1/join-requests/x/review", {
        method: "POST",
        headers: { ...cookie("host"), "content-type": "application/json" },
        body: JSON.stringify({ decision: "reject" }),
      }),
      createdJson.data.id,
    );
    const trip = await handleGetTripRequest(
      new Request("http://localhost/api/v1/trips/trip_open", {
        headers: cookie("complete"),
      }),
      "trip_open",
    );
    const json = (await trip.json()) as {
      data: { joinFree: true; myJoinRequest: { status: string } | null };
    };
    expect(json.data.joinFree).toBe(true);
    expect(json.data.myJoinRequest?.status).toBe("REJECTED");
  });

  it("lets the applicant withdraw a pending request", async () => {
    const created = await handleRequestJoinRequest(
      new Request("http://localhost/api/v1/trips/trip_open/join-requests", {
        method: "POST",
        headers: { ...cookie("complete"), "content-type": "application/json" },
        body: JSON.stringify({}),
      }),
      "trip_open",
    );
    const createdJson = (await created.json()) as { data: { id: string } };
    const withdrawn = await handleWithdrawJoinRequest(
      new Request("http://localhost/api/v1/join-requests/x/withdraw", {
        method: "POST",
        headers: cookie("complete"),
      }),
      createdJson.data.id,
    );
    const json = (await withdrawn.json()) as { data: { status: string } };
    expect(json.data.status).toBe("WITHDRAWN");
  });
});

describe("chat and notifications", () => {
  it("blocks pending members from reading chat", async () => {
    await handleRequestJoinRequest(
      new Request("http://localhost/api/v1/trips/trip_open/join-requests", {
        method: "POST",
        headers: { ...cookie("complete"), "content-type": "application/json" },
        body: JSON.stringify({}),
      }),
      "trip_open",
    );
    const response = await handleListMessagesRequest(
      new Request("http://localhost/api/v1/trips/trip_open/messages", {
        headers: cookie("complete"),
      }),
      "trip_open",
    );
    const json = (await response.json()) as { error: { code: string } };
    expect(json.error.code).toBe("NOT_MEMBER");
  });

  it("lets the host read chat", async () => {
    const response = await handleListMessagesRequest(
      new Request("http://localhost/api/v1/trips/trip_1/messages", {
        headers: cookie("host"),
      }),
      "trip_1",
    );
    const json = (await response.json()) as { success: boolean };
    expect(json.success).toBe(true);
  });

  it("lets the host send a chat message", async () => {
    const response = await handleSendMessageRequest(
      new Request("http://localhost/api/v1/trips/trip_1/messages", {
        method: "POST",
        headers: { ...cookie("host"), "content-type": "application/json" },
        body: JSON.stringify({
          clientMessageId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
          body: "Titik kumpul jam 7",
        }),
      }),
      "trip_1",
    );
    const json = (await response.json()) as {
      success: true;
      data: { body: string };
    };
    expect(json.success).toBe(true);
    expect(json.data.body).toBe("Titik kumpul jam 7");
  });

  it("returns PROVIDER_UNAVAILABLE when chat disconnect is simulated", async () => {
    const response = await handleListMessagesRequest(
      new Request("http://localhost/api/v1/trips/trip_1/messages?simulate=disconnect", {
        headers: cookie("host"),
      }),
      "trip_1",
    );
    const json = (await response.json()) as { error: { code: string } };
    expect(json.error.code).toBe("PROVIDER_UNAVAILABLE");
  });

  it("lists notifications with an unread item", async () => {
    const response = await handleListNotificationsRequest(
      new Request("http://localhost/api/v1/notifications", {
        headers: cookie("complete"),
      }),
    );
    const json = (await response.json()) as {
      success: true;
      data: { unreadCount: number; items: { readAt: string | null }[] };
    };
    expect(json.data.unreadCount).toBeGreaterThan(0);
    expect(json.data.items.some((item) => item.readAt === null)).toBe(true);
  });

  it("marks a notification as read and drops unread count", async () => {
    const listed = await handleListNotificationsRequest(
      new Request("http://localhost/api/v1/notifications", {
        headers: cookie("complete"),
      }),
    );
    const listedJson = (await listed.json()) as {
      data: { items: { id: string }[]; unreadCount: number };
    };
    const unreadId = listedJson.data.items[0]?.id;
    const marked = await handleMarkNotificationReadRequest(
      new Request("http://localhost/api/v1/notifications/x/read", {
        method: "POST",
        headers: cookie("complete"),
      }),
      unreadId!,
    );
    const markedJson = (await marked.json()) as { data: { readAt: string | null } };
    expect(markedJson.data.readAt).toBeTruthy();
    const again = await handleListNotificationsRequest(
      new Request("http://localhost/api/v1/notifications", {
        headers: cookie("complete"),
      }),
    );
    const againJson = (await again.json()) as { data: { unreadCount: number } };
    expect(againJson.data.unreadCount).toBe(listedJson.data.unreadCount - 1);
  });
});
