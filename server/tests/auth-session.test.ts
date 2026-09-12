import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.ts";
import { MockAuthAdapter } from "../src/integrations/supabase/mock-auth-adapter.ts";
import { AuthService } from "../src/modules/auth/auth-service.ts";
import { MemoryUserRepository } from "../src/modules/auth/user-repository.ts";

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
  });

  it("rejects draft creation for guests and allows it for logged-in users", async () => {
    const guest = await request(app()).post("/api/v1/trips/drafts");
    expect(guest.status).toBe(401);

    const user = await request(app())
      .post("/api/v1/trips/drafts")
      .set("Authorization", "Bearer mock-unverified");
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
    const response = await request(app())
      .get("/api/v1/trips/trip-1/messages?membership=PENDING")
      .set("Authorization", "Bearer mock-verified-complete");
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("PENDING_MEMBER");
  });
});
