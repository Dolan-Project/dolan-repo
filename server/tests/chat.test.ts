import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.ts";
import { MockAuthAdapter } from "../src/integrations/supabase/mock-auth-adapter.ts";
import { AuthService } from "../src/modules/auth/auth-service.ts";
import { ChatService } from "../src/modules/chat/chat-service.ts";
import { MemoryChatStore } from "../src/modules/chat/memory-chat-store.ts";
import { MemoryUserRepository } from "../src/modules/auth/user-repository.ts";
import { createJobService, createMemorySearchService } from "../src/container.ts";

const HOST = "11111111-1111-4111-8111-111111111111";
const MEMBER = "44444444-4444-4444-8444-444444444444";
const PENDING = "33333333-3333-4333-8333-333333333333";
const TRIP = "trip-chat-1";
const keyA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const keyB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function setup() {
  const store = new MemoryChatStore();
  store.seedTrip({
    tripId: TRIP,
    hostUserId: HOST,
    participants: [MEMBER],
    pending: [PENDING],
  });
  const chat = new ChatService(store);
  const auth = new AuthService(new MockAuthAdapter(), new MemoryUserRepository());
  const app = createApp(auth, () => 0, createMemorySearchService(), createJobService(), chat);
  return { app, store, chat };
}

describe("chat and notifications", () => {
  it("rejects pending members on REST chat", async () => {
    const { app } = setup();
    const response = await request(app)
      .get(`/api/v1/trips/${TRIP}/messages`)
      .set("Authorization", "Bearer mock-incomplete-profile");
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("PENDING_MEMBER");
  });

  it("lets an active member send, dedupe, and catch up after reconnect", async () => {
    const { app } = setup();
    const first = await request(app)
      .post(`/api/v1/trips/${TRIP}/messages`)
      .set("Authorization", "Bearer mock-verified-complete")
      .send({ clientMessageId: keyA, body: "halo" });
    expect(first.status).toBe(201);
    expect(first.body.data.body).toBe("halo");

    const replay = await request(app)
      .post(`/api/v1/trips/${TRIP}/messages`)
      .set("Authorization", "Bearer mock-verified-complete")
      .send({ clientMessageId: keyA, body: "halo" });
    expect(replay.status).toBe(200);
    expect(replay.body.data.id).toBe(first.body.data.id);

    const second = await request(app)
      .post(`/api/v1/trips/${TRIP}/messages`)
      .set("Authorization", "Bearer mock-verified-complete")
      .send({ clientMessageId: keyB, body: "lagi" });
    expect(second.status).toBe(201);

    const catchUp = await request(app)
      .get(`/api/v1/trips/${TRIP}/messages?after=${first.body.data.id}`)
      .set("Authorization", "Bearer mock-admin");
    expect(catchUp.status).toBe(200);
    expect(catchUp.body.data.messages).toHaveLength(1);
    expect(catchUp.body.data.messages[0].body).toBe("lagi");
  });

  it("does not notify the sender and keeps inbox readable without socket", async () => {
    const { app } = setup();
    await request(app)
      .post(`/api/v1/trips/${TRIP}/messages`)
      .set("Authorization", "Bearer mock-verified-complete")
      .send({ clientMessageId: keyA, body: "ping" });

    const senderInbox = await request(app)
      .get("/api/v1/notifications")
      .set("Authorization", "Bearer mock-verified-complete");
    expect(senderInbox.body.data).toHaveLength(0);

    const memberInbox = await request(app)
      .get("/api/v1/notifications")
      .set("Authorization", "Bearer mock-admin");
    expect(memberInbox.body.data).toHaveLength(1);
    expect(memberInbox.body.data[0].type).toBe("message.created");
    expect(memberInbox.body.data[0].actorUserId).toBe(HOST);

    const read = await request(app)
      .post(`/api/v1/notifications/${memberInbox.body.data[0].id}/read`)
      .set("Authorization", "Bearer mock-admin");
    expect(read.body.data.readAt).toBeTruthy();
  });

  it("blocks send on a cancelled room and evicts a leaver from the socket room", async () => {
    const { app, store, chat } = setup();
    store.setReadOnly(TRIP, true);
    const blocked = await request(app)
      .post(`/api/v1/trips/${TRIP}/messages`)
      .set("Authorization", "Bearer mock-verified-complete")
      .send({ clientMessageId: keyA, body: "nope" });
    expect(blocked.status).toBe(403);
    expect(blocked.body.error.code).toBe("ROOM_READ_ONLY");

    store.setReadOnly(TRIP, false);
    await chat.evictFromRoom(TRIP, MEMBER, "LEFT");
    const left = await request(app)
      .get(`/api/v1/trips/${TRIP}/messages`)
      .set("Authorization", "Bearer mock-admin");
    expect(left.status).toBe(403);
    expect(left.body.error.code).toBe("NOT_MEMBER");

    await request(app)
      .post(`/api/v1/trips/${TRIP}/messages`)
      .set("Authorization", "Bearer mock-verified-complete")
      .send({ clientMessageId: keyB, body: "after leave" });
    const inbox = await request(app)
      .get("/api/v1/notifications")
      .set("Authorization", "Bearer mock-admin");
    expect(inbox.body.data).toHaveLength(0);
  });
});
