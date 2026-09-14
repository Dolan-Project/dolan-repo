import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.ts";
import { createJobService, createMemorySearchService } from "../src/container.ts";
import { MockAuthAdapter } from "../src/integrations/supabase/mock-auth-adapter.ts";
import { AuthService } from "../src/modules/auth/auth-service.ts";
import { ChatService } from "../src/modules/chat/chat-service.ts";
import { MemoryChatStore } from "../src/modules/chat/memory-chat-store.ts";
import { MemoryUserRepository } from "../src/modules/auth/user-repository.ts";
import { LocationService } from "../src/modules/location/location-service.ts";
import { MemoryLocationStore } from "../src/modules/location/memory-location-store.ts";

const HOST = "11111111-1111-4111-8111-111111111111";
const MEMBER = "44444444-4444-4444-8444-444444444444";
const PENDING = "33333333-3333-4333-8333-333333333333";
const TRIP = "trip-loc-1";

function setup() {
  const chatStore = new MemoryChatStore();
  chatStore.seedTrip({ tripId: TRIP, hostUserId: HOST, participants: [MEMBER], pending: [PENDING] });
  const chat = new ChatService(chatStore);
  const locations = new LocationService(new MemoryLocationStore(), chat);
  const auth = new AuthService(new MockAuthAdapter(), new MemoryUserRepository());
  const app = createApp(
    auth,
    () => 0,
    createMemorySearchService(),
    createJobService(),
    undefined,
    chat,
    false,
    undefined,
    locations,
  );
  return { app };
}

describe("location share API", () => {
  it("is opt-in, visible to members, and hidden from pending", async () => {
    const { app } = setup();
    const started = await request(app)
      .post(`/api/v1/trips/${TRIP}/location/start`)
      .set("Authorization", "Bearer mock-verified-complete")
      .send({ duration: "ONE_HOUR", scope: "TRIP_PRECISE" });
    expect(started.status).toBe(201);

    await request(app)
      .post(`/api/v1/trips/${TRIP}/location/ping`)
      .set("Authorization", "Bearer mock-verified-complete")
      .send({ latitude: -7.7928123, longitude: 110.3658444 });

    const memberView = await request(app)
      .get(`/api/v1/trips/${TRIP}/locations`)
      .set("Authorization", "Bearer mock-admin");
    expect(memberView.status).toBe(200);
    expect(memberView.body.data.locations[0].freshness).toBe("LIVE");
    expect(memberView.body.data.locations[0].latitude).toBe(-7.7928123);

    const pendingView = await request(app)
      .get(`/api/v1/trips/${TRIP}/locations`)
      .set("Authorization", "Bearer mock-incomplete-profile");
    expect(pendingView.status).toBe(403);
    expect(pendingView.body.error.code).toBe("PENDING_MEMBER");

    await request(app)
      .post(`/api/v1/trips/${TRIP}/location/stop`)
      .set("Authorization", "Bearer mock-verified-complete");
    const afterStop = await request(app)
      .get(`/api/v1/trips/${TRIP}/locations`)
      .set("Authorization", "Bearer mock-admin");
    expect(afterStop.body.data.locations).toHaveLength(0);
  });
});
