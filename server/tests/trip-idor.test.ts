import request from "supertest";
import { describe, expect, it } from "vitest";
import { AuthErrorCode, TripErrorCode } from "@dolan/shared";
import { createApp } from "../src/app.ts";
import { createJobService, createMemorySearchService } from "../src/container.ts";
import { MockAuthAdapter } from "../src/integrations/supabase/mock-auth-adapter.ts";
import { AuthService } from "../src/modules/auth/auth-service.ts";
import { ChatService } from "../src/modules/chat/chat-service.ts";
import { MemoryChatStore } from "../src/modules/chat/memory-chat-store.ts";
import { MemoryUserRepository } from "../src/modules/auth/user-repository.ts";
import { MemoryTripStore } from "../src/modules/trips/memory-store.ts";
import { TripService } from "../src/modules/trips/trip-service.ts";
import { idempotencyKey as k } from "./idempotency-key.ts";

const HOST = "Bearer mock-verified-complete";
const BUDDI = "Bearer mock-verified-budi";
const HOST_ID = "11111111-1111-4111-8111-111111111111";
const BUDI_ID = "55555555-5555-4555-8555-555555555555";

function setup() {
  const trips = new MemoryTripStore();
  const chat = new MemoryChatStore();
  const api = createApp(
    new AuthService(new MockAuthAdapter(), new MemoryUserRepository()),
    () => 0,
    createMemorySearchService(),
    createJobService(),
    new TripService(trips),
    new ChatService(chat),
  );
  return { api, trips, chat };
}

async function publishPublic(api: ReturnType<typeof setup>["api"], title: string) {
  const created = await request(api)
    .post("/api/v1/trips")
    .set("Authorization", HOST)
    .set("Idempotency-Key", k(`idor-create-${title}`))
    .send({
      title,
      visibility: "PUBLIC",
      startDate: "2026-10-01",
      endDate: "2026-10-03",
      destinationCity: "Yogyakarta",
      maxParticipants: 3,
      publicMeetingPointLabel: "Tugu",
    });
  const published = await request(api)
    .post(`/api/v1/trips/${created.body.data.id}/publish`)
    .set("Authorization", HOST)
    .set("Idempotency-Key", k(`idor-publish-${title}`))
    .send({ visibility: "PUBLIC" });
  return published.body.data as { id: string };
}

describe("WIRA-D4 IDOR", () => {
  it("hides another user's private draft and does not leak host actions", async () => {
    const { api } = setup();
    const draft = await request(api)
      .post("/api/v1/trips")
      .set("Authorization", HOST)
      .set("Idempotency-Key", k("idor-draft"))
      .send({ title: "Private draft" });

    const stolen = await request(api).get(`/api/v1/trips/${draft.body.data.id}`).set("Authorization", BUDDI);
    expect(stolen.status).toBe(404);
    expect(stolen.body.error.code).toBe(TripErrorCode.TRIP_NOT_FOUND);

    const comments = await request(api)
      .get(`/api/v1/trips/${draft.body.data.id}/comments`)
      .set("Authorization", BUDDI);
    expect(comments.status).toBe(404);

    const publish = await request(api)
      .post(`/api/v1/trips/${draft.body.data.id}/publish`)
      .set("Authorization", BUDDI)
      .set("Idempotency-Key", k("idor-hijack-publish"))
      .send({ visibility: "PUBLIC" });
    expect(publish.status).toBe(404);
  });

  it("does not let query flags grant chat on a foreign trip", async () => {
    const { api, chat } = setup();
    const trip = await publishPublic(api, "Chat IDOR");
    chat.seedTrip({ tripId: trip.id, hostUserId: HOST_ID });
    const spoofed = await request(api)
      .get(`/api/v1/trips/${trip.id}/messages?membership=ACTIVE&role=HOST`)
      .set("Authorization", BUDDI);
    expect(spoofed.status).toBe(403);
    expect(spoofed.body.error.code).toBe(AuthErrorCode.NOT_MEMBER);

    const inbox = await request(api).get("/api/v1/notifications").set("Authorization", BUDDI);
    expect(inbox.status).toBe(200);
    expect(inbox.body.data).toHaveLength(0);
  });

  it("evicts a participant from chat after leave", async () => {
    const left: string[] = [];
    const trips = new MemoryTripStore();
    const api = createApp(
      new AuthService(new MockAuthAdapter(), new MemoryUserRepository()),
      () => 0,
      createMemorySearchService(),
      createJobService(),
      new TripService(trips, {
        evictFromRoom(tripId, userId) {
          left.push(`${tripId}:${userId}`);
        },
      }),
    );
    const trip = await publishPublic(api, "Leave evict");
    const join = await request(api)
      .post(`/api/v1/trips/${trip.id}/join-requests`)
      .set("Authorization", BUDDI)
      .set("Idempotency-Key", k("idor-leave-join"))
      .send({});
    await request(api)
      .post(`/api/v1/join-requests/${join.body.data.id}/review`)
      .set("Authorization", HOST)
      .set("Idempotency-Key", k("idor-leave-accept"))
      .send({ decision: "accept" });
    const leave = await request(api).post(`/api/v1/trips/${trip.id}/leave`).set("Authorization", BUDDI);
    expect(leave.status).toBe(200);
    expect(left).toEqual([`${trip.id}:${BUDI_ID}`]);
  });

  it("keeps join-request review private to the host", async () => {
    const { api } = setup();
    const trip = await publishPublic(api, "Review IDOR");
    const join = await request(api)
      .post(`/api/v1/trips/${trip.id}/join-requests`)
      .set("Authorization", BUDDI)
      .set("Idempotency-Key", k("idor-join"))
      .send({});
    const selfReview = await request(api)
      .post(`/api/v1/join-requests/${join.body.data.id}/review`)
      .set("Authorization", BUDDI)
      .set("Idempotency-Key", k("idor-self-review"))
      .send({ decision: "accept" });
    expect(selfReview.status).toBe(403);
    expect(selfReview.body.error.code).toBe(AuthErrorCode.NOT_HOST);
    expect(HOST_ID).not.toBe(BUDI_ID);
  });

  it("rejects stolen notification ids and comment edits", async () => {
    const { api, chat } = setup();
    const trip = await publishPublic(api, "Notif IDOR");
    chat.seedTrip({ tripId: trip.id, hostUserId: HOST_ID, participants: [BUDI_ID] });
    await request(api)
      .post(`/api/v1/trips/${trip.id}/messages`)
      .set("Authorization", HOST)
      .send({ clientMessageId: k("idor-msg"), body: "halo" });
    const memberInbox = await request(api).get("/api/v1/notifications").set("Authorization", BUDDI);
    expect(memberInbox.body.data).toHaveLength(1);
    const stolen = await request(api)
      .post(`/api/v1/notifications/${memberInbox.body.data[0].id}/read`)
      .set("Authorization", HOST);
    expect(stolen.status).toBe(404);

    const comment = await request(api)
      .post(`/api/v1/trips/${trip.id}/comments`)
      .set("Authorization", HOST)
      .set("Idempotency-Key", k("idor-comment"))
      .send({ body: "Milik host" });
    const hijack = await request(api)
      .patch(`/api/v1/trips/${trip.id}/comments/${comment.body.data.id}`)
      .set("Authorization", BUDDI)
      .send({ body: "Direbut" });
    expect(hijack.status).toBe(403);
    const wipe = await request(api)
      .delete(`/api/v1/trips/${trip.id}/comments/${comment.body.data.id}`)
      .set("Authorization", BUDDI);
    expect(wipe.status).toBe(403);
  });

  it("rejects self-follow on the social helper endpoint", async () => {
    const { api } = setup();
    const self = await request(api)
      .post(`/api/v1/users/${HOST_ID}/follow`)
      .set("Authorization", HOST);
    expect(self.status).toBe(400);
    expect(self.body.error.code).toBe("SELF_FOLLOW");
  });

  it("lets the host read chat after publish without seeding chat separately", async () => {
    const api = createApp(new AuthService(new MockAuthAdapter(), new MemoryUserRepository()));
    const created = await request(api)
      .post("/api/v1/trips")
      .set("Authorization", HOST)
      .set("Idempotency-Key", k("wired-create"))
      .send({
        title: "Chat setelah publish",
        visibility: "PUBLIC",
        startDate: "2026-10-01",
        endDate: "2026-10-03",
        destinationCity: "Yogyakarta",
        maxParticipants: 3,
        publicMeetingPointLabel: "Tugu",
      });
    await request(api)
      .post(`/api/v1/trips/${created.body.data.id}/publish`)
      .set("Authorization", HOST)
      .set("Idempotency-Key", k("wired-publish"))
      .send({ visibility: "PUBLIC" });
    const messages = await request(api)
      .get(`/api/v1/trips/${created.body.data.id}/messages`)
      .set("Authorization", HOST);
    expect(messages.status).toBe(200);
    expect(messages.body.data.messages).toEqual([]);
  });
});
