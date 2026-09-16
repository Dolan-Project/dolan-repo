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

describe("local password auth", () => {
  it("registers, logs in, and resolves /me with the session token", async () => {
    const api = localApp();
    const email = `user-${Date.now()}@dolan.test`;
    const registered = await request(api)
      .post("/api/v1/auth/register")
      .send({
        email,
        password: "rahasia88",
        confirmPassword: "rahasia88",
        username: `u${Date.now().toString().slice(-6)}`,
        displayName: "Local User",
      });
    expect(registered.status).toBe(201);
    expect(registered.body.data.accessToken).toBeTruthy();
    expect(registered.body.data.session.emailVerified).toBe(true);

    const me = await request(api)
      .get("/api/v1/users/me")
      .set("Authorization", `Bearer ${registered.body.data.accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body.data.user.displayName).toBe("Local User");

    const login = await request(api)
      .post("/api/v1/auth/login")
      .send({ email, password: "rahasia88" });
    expect(login.status).toBe(200);
    expect(login.body.data.session.user.displayName).toBe("Local User");
  });

  it("rejects wrong password and accepts seeded memory user", async () => {
    const api = localApp();
    const wrong = await request(api)
      .post("/api/v1/auth/login")
      .send({ email: "verified@dolan.test", password: "bukanpassword" });
    expect(wrong.status).toBe(401);

    const ok = await request(api)
      .post("/api/v1/auth/login")
      .send({ email: "verified@dolan.test", password: "password123" });
    expect(ok.status).toBe(200);
    expect(ok.body.data.session.user.username).toBe("alya");
  });
});
