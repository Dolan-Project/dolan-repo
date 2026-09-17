import { describe, expect, it, vi } from "vitest";
import { AuthService } from "../src/modules/auth/auth-service.ts";
import { env } from "../src/config/env.ts";
import { encodeOAuthState } from "../src/modules/auth/google-oauth.ts";
import { LocalSessionAuthAdapter } from "../src/modules/auth/local-auth-adapter.ts";
import { MemorySessionStore } from "../src/modules/auth/session-store.ts";
import { MemoryUserRepository } from "../src/modules/auth/user-repository.ts";

describe("Google OAuth (Express)", () => {
  it("creates a session from Google profile and returns web callback URL", async () => {
    const users = new MemoryUserRepository();
    const sessions = new MemorySessionStore();
    const auth = new AuthService(new LocalSessionAuthAdapter(sessions, users), users, sessions);
    const state = encodeOAuthState("/jelajah");

    env.googleOAuthClientId = "client-id";
    env.googleOAuthClientSecret = "secret";
    env.googleOAuthRedirectUri = "http://localhost:4000/api/v1/auth/google/callback";

    const fetchImpl: typeof fetch = vi.fn(async (input, init) => {
      const target = String(input);
      if (target.includes("oauth2.googleapis.com/token")) {
        expect(init?.method).toBe("POST");
        return new Response(JSON.stringify({ access_token: "ya29.token" }), { status: 200 });
      }
      if (target.includes("oauth2/v3/userinfo")) {
        return new Response(
          JSON.stringify({
            sub: "google-sub-1",
            email: "google.user@example.com",
            email_verified: true,
            name: "Google User",
            picture: "https://example.com/a.png",
          }),
          { status: 200 },
        );
      }
      return new Response("not found", { status: 404 });
    }) as typeof fetch;

    const result = await auth.completeGoogleLogin({ code: "auth-code", state, fetchImpl });
    expect(result.redirectUrl).toContain("/api/auth/callback");
    expect(result.redirectUrl).toContain("token=");
    expect(result.redirectUrl).toContain("next=%2Fjelajah");

    const created = await users.findByEmail("google.user@example.com");
    expect(created?.authReference).toBe("google:google-sub-1");
    expect(created?.displayName).toBe("Google User");
  });

  it("links Google login to an existing email account", async () => {
    const users = new MemoryUserRepository();
    const sessions = new MemorySessionStore();
    const auth = new AuthService(new LocalSessionAuthAdapter(sessions, users), users, sessions);
    await users.createLocalUser({
      email: "linked@example.com",
      password: "password123",
      username: "linked",
      displayName: "Linked User",
    });

    env.googleOAuthClientId = "client-id";
    env.googleOAuthClientSecret = "secret";
    env.googleOAuthRedirectUri = "http://localhost:4000/api/v1/auth/google/callback";

    const fetchImpl: typeof fetch = vi.fn(async (input) => {
      const target = String(input);
      if (target.includes("/token")) {
        return new Response(JSON.stringify({ access_token: "ya29.token" }), { status: 200 });
      }
      return new Response(
        JSON.stringify({
          sub: "google-sub-2",
          email: "linked@example.com",
          email_verified: true,
          name: "Google Name",
        }),
        { status: 200 },
      );
    }) as typeof fetch;

    const result = await auth.completeGoogleLogin({
      code: "auth-code",
      state: encodeOAuthState("/"),
      fetchImpl,
    });
    expect(result.redirectUrl).toContain("token=");
    const user = await users.findByEmail("linked@example.com");
    expect(user?.username).toBe("linked");
    expect(user?.authReference.startsWith("local:")).toBe(true);
  });
});
