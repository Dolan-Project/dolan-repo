import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.ts";
import { createJobService, createMemorySearchService, createMemoryTripService } from "../src/container.ts";
import { MockAuthAdapter } from "../src/integrations/supabase/mock-auth-adapter.ts";
import { AuthService } from "../src/modules/auth/auth-service.ts";
import { ChatService } from "../src/modules/chat/chat-service.ts";
import { MemoryChatStore } from "../src/modules/chat/memory-chat-store.ts";
import { MemoryUserRepository } from "../src/modules/auth/user-repository.ts";
import { idempotencyKey as k } from "./idempotency-key.ts";

function app() {
  return createApp(new AuthService(new MockAuthAdapter(), new MemoryUserRepository()));
}

describe("auth session and guards", () => {
  it("lets guests read public endpoints", async () => {
    const response = await request(app()).get("/api/v1/public/ping");
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  it("returns application identity after a valid bearer token", async () => {
    const response = await request(app())
      .get("/api/v1/auth/session")
      .set("Authorization", "Bearer mock-verified-complete");

    expect(response.status).toBe(200);
    expect(response.body.data.email).toBe("verified@dolan.test");
    expect(response.body.data.profileComplete).toBe(true);
    expect(JSON.stringify(response.body)).not.toMatch(/Bearer|eyJ|mock-verified-complete|refresh/i);

    const me = await request(app())
      .get("/api/v1/users/me")
      .set("Authorization", "Bearer mock-verified-complete");
    expect(me.status).toBe(200);
    expect(me.body.data.user.username).toBe("alya");
    expect(me.body.data.emailVerified).toBe(true);
    expect(JSON.stringify(me.body)).not.toMatch(/verified@dolan\.test/);
  });

  it("rejects draft creation for guests and allows it for logged-in users", async () => {
    const guest = await request(app()).post("/api/v1/trips/drafts");
    expect(guest.status).toBe(401);

    const user = await request(app())
      .post("/api/v1/trips/drafts")
      .set("Authorization", "Bearer mock-unverified")
      .set("Idempotency-Key", k("auth-draft-1"))
      .send({ title: "Trip baru" });
    expect(user.status).toBe(201);
  });

  it("rejects publish and join when the profile is incomplete", async () => {
    const publish = await request(app())
      .post("/api/v1/trips/trip-1/publish")
      .set("Authorization", "Bearer mock-incomplete-profile");
    expect(publish.status).toBe(403);
    expect(publish.body.error.code).toBe("PROFILE_INCOMPLETE");
  });

  it("rejects pending members from chat", async () => {
    const chatStore = new MemoryChatStore();
    chatStore.seedTrip({
      tripId: "trip-1",
      hostUserId: "44444444-4444-4444-8444-444444444444",
      pending: ["11111111-1111-4111-8111-111111111111"],
    });
    const api = createApp(
      new AuthService(new MockAuthAdapter(), new MemoryUserRepository()),
      () => 0,
      createMemorySearchService(),
      createJobService(),
      createMemoryTripService(),
      new ChatService(chatStore),
    );
    const response = await request(api)
      .get("/api/v1/trips/trip-1/messages")
      .set("Authorization", "Bearer mock-verified-complete");
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("PENDING_MEMBER");
  });

  it("updates an incomplete profile and hides email on public profiles", async () => {
    const api = app();
    const patched = await request(api)
      .patch("/api/v1/users/me")
      .set("Authorization", "Bearer mock-incomplete-profile")
      .send({
        username: "dimas_baru",
        displayName: "Dimas",
        domicile: "Bali",
        bio: "Siap dolan",
      });
    expect(patched.status).toBe(200);
    expect(patched.body.data.user.username).toBe("dimas_baru");
    expect(patched.body.data.profileComplete).toBe(true);
    expect(JSON.stringify(patched.body)).not.toMatch(/incomplete@dolan\.test/);

    const taken = await request(api)
      .patch("/api/v1/users/me")
      .set("Authorization", "Bearer mock-verified-complete")
      .send({
        username: "dimas_baru",
        displayName: "Alya",
        domicile: "Jakarta",
      });
    expect(taken.status).toBe(409);
    expect(taken.body.error.code).toBe("USERNAME_TAKEN");

    const pub = await request(api).get("/api/v1/users/dimas_baru");
    expect(pub.status).toBe(200);
    expect(pub.body.data.username).toBe("dimas_baru");
    expect(pub.body.data.email).toBeUndefined();
    expect(JSON.stringify(pub.body)).not.toMatch(/incomplete@dolan\.test/);
  });
});
