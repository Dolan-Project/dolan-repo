import request from "supertest";
import { describe, expect, it } from "vitest";
import { AuthErrorCode } from "@dolan/shared";
import { createApp } from "../src/app.ts";
import { MockAuthAdapter } from "../src/integrations/supabase/mock-auth-adapter.ts";
import { AuthService } from "../src/modules/auth/auth-service.ts";
import { MemoryUserRepository } from "../src/modules/auth/user-repository.ts";

describe("WIRA-D4 rate limit", () => {
  it("returns 429 RATE_LIMITED after the window is exhausted", async () => {
    const api = createApp(
      new AuthService(new MockAuthAdapter(), new MemoryUserRepository()),
      () => 0,
      undefined,
      undefined,
      undefined,
      undefined,
      { windowMs: 60_000, max: 2, searchMax: 2 },
    );

    await request(api).get("/api/v1/public/ping");
    await request(api).get("/api/v1/public/ping");
    const blocked = await request(api).get("/api/v1/public/ping");
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe(AuthErrorCode.RATE_LIMITED);
    expect(blocked.headers["retry-after"]).toBeTruthy();

    const health = await request(api).get("/health");
    expect(health.status).toBe(200);
  });
});
