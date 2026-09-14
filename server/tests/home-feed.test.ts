import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.ts";
import { AuthService } from "../src/modules/auth/auth-service.ts";
import { LocalSessionAuthAdapter } from "../src/modules/auth/local-auth-adapter.ts";
import { MemorySessionStore } from "../src/modules/auth/session-store.ts";
import { MemoryUserRepository } from "../src/modules/auth/user-repository.ts";

function localApp() {
  const users = new MemoryUserRepository();
  const sessions = new MemorySessionStore();
  const auth = new AuthService(new LocalSessionAuthAdapter(sessions, users), users, sessions);
  return createApp(auth);
}

describe("home feed", () => {
  it("returns feed sections for authenticated users without Places", async () => {
    const api = localApp();
    const login = await request(api)
      .post("/api/v1/auth/login")
      .send({ email: "verified@dolan.test", password: "password123" });
    expect(login.status).toBe(200);
    const token = login.body.data.accessToken as string;

    const feed = await request(api)
      .get("/api/v1/home/feed")
      .set("Authorization", `Bearer ${token}`);
    expect(feed.status).toBe(200);
    expect(Array.isArray(feed.body.data.trips)).toBe(true);
    expect(Array.isArray(feed.body.data.templates)).toBe(true);
    expect(feed.body.data.provinces.length).toBeGreaterThan(0);
    expect(feed.body.data.tasks).toMatchObject({
      profileComplete: true,
      domicile: "Jakarta",
    });
  });

  it("rejects guests", async () => {
    const api = localApp();
    const feed = await request(api).get("/api/v1/home/feed");
    expect(feed.status).toBe(401);
  });
});
