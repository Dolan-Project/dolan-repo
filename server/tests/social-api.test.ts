import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.ts";
import { createJobService, createMemorySearchService } from "../src/container.ts";
import { MockAuthAdapter } from "../src/integrations/supabase/mock-auth-adapter.ts";
import { AuthService } from "../src/modules/auth/auth-service.ts";
import { MemoryUserRepository } from "../src/modules/auth/user-repository.ts";
import { MemorySocialStore } from "../src/modules/social/social-queries.ts";

const ALYA = "Bearer mock-verified-complete";

function app() {
  const social = new MemorySocialStore();
  return {
    social,
    api: createApp(
      new AuthService(new MockAuthAdapter(), new MemoryUserRepository()),
      () => 0,
      createMemorySearchService(),
      createJobService(),
      undefined,
      undefined,
      false,
      social,
    ),
  };
}

describe("SALSA-D4 social REST", () => {
  it("follows by username, lists followers, then unfollows", async () => {
    const { api } = app();
    const follow = await request(api).post("/api/v1/users/budi/follow").set("Authorization", ALYA);
    expect(follow.status).toBe(201);
    expect(follow.body.data.following).toBe(true);

    const followers = await request(api)
      .get("/api/v1/users/budi/followers")
      .set("Authorization", ALYA);
    expect(followers.status).toBe(200);
    expect(followers.body.data.items.some((row: { username: string }) => row.username === "alya")).toBe(
      true,
    );

    const unfollow = await request(api)
      .delete("/api/v1/users/budi/follow")
      .set("Authorization", ALYA);
    expect(unfollow.status).toBe(200);
    expect(unfollow.body.data.following).toBe(false);
  });

  it("drops follows on block and rejects follow plus join across the block", async () => {
    const { api } = app();
    await request(api).post("/api/v1/users/budi/follow").set("Authorization", ALYA);
    const blocked = await request(api).post("/api/v1/users/budi/block").set("Authorization", ALYA);
    expect(blocked.status).toBe(200);
    expect(blocked.body.data.blocked).toBe(true);

    const followers = await request(api)
      .get("/api/v1/users/budi/followers")
      .set("Authorization", ALYA);
    expect(followers.body.data.items).toEqual([]);

    const followAgain = await request(api)
      .post("/api/v1/users/budi/follow")
      .set("Authorization", ALYA);
    expect(followAgain.status).toBe(409);
    expect(followAgain.body.error.code).toBe("BLOCKED_RELATION");
  });

  it("still rejects self-follow by user id", async () => {
    const { api } = app();
    const self = await request(api)
      .post("/api/v1/users/11111111-1111-4111-8111-111111111111/follow")
      .set("Authorization", ALYA);
    expect(self.status).toBe(400);
    expect(self.body.error.code).toBe("SELF_FOLLOW");
  });
});
