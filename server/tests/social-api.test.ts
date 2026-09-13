import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.ts";
import { createJobService, createMemorySearchService } from "../src/container.ts";
import { MockAuthAdapter } from "../src/integrations/supabase/mock-auth-adapter.ts";
import { AuthService } from "../src/modules/auth/auth-service.ts";
import { MemoryUserRepository } from "../src/modules/auth/user-repository.ts";
import { MemorySocialStore } from "../src/modules/social/social-queries.ts";
import { MemoryTripStore } from "../src/modules/trips/memory-store.ts";
import { TripService } from "../src/modules/trips/trip-service.ts";
import { idempotencyKey as k } from "./idempotency-key.ts";

const ALYA = "Bearer mock-verified-complete";
const BUDI = "Bearer mock-verified-budi";
const ADMIN = "Bearer mock-admin";

function app() {
  const social = new MemorySocialStore();
  const store = new MemoryTripStore();
  return {
    social,
    store,
    api: createApp(
      new AuthService(new MockAuthAdapter(), new MemoryUserRepository()),
      () => 0,
      createMemorySearchService(),
      createJobService(),
      new TripService(store, undefined, social),
      undefined,
      false,
      social,
    ),
  };
}

async function publishPublic(api: ReturnType<typeof app>["api"], title: string) {
  const created = await request(api)
    .post("/api/v1/trips")
    .set("Authorization", ALYA)
    .set("Idempotency-Key", k(`create-${title}`))
    .send({
      title,
      visibility: "PUBLIC",
      startDate: "2026-10-01",
      endDate: "2026-10-03",
      destinationCity: "Yogyakarta",
      maxParticipants: 2,
      publicMeetingPointLabel: "Stasiun Tugu",
    });
  expect(created.status).toBe(201);
  const published = await request(api)
    .post(`/api/v1/trips/${created.body.data.id}/publish`)
    .set("Authorization", ALYA)
    .set("Idempotency-Key", k(`publish-${title}`))
    .send({ visibility: "PUBLIC" });
  expect(published.status).toBe(200);
  return published.body.data as { id: string; title: string };
}

async function completeSharedTrip(api: ReturnType<typeof app>["api"], title: string) {
  const trip = await publishPublic(api, title);
  const join = await request(api)
    .post(`/api/v1/trips/${trip.id}/join-requests`)
    .set("Authorization", BUDI)
    .set("Idempotency-Key", k(`join-${title}`))
    .send({});
  expect(join.status).toBe(201);
  const accepted = await request(api)
    .post(`/api/v1/join-requests/${join.body.data.id}/review`)
    .set("Authorization", ALYA)
    .set("Idempotency-Key", k(`accept-${title}`))
    .send({ decision: "accept" });
  expect(accepted.status).toBe(200);
  const started = await request(api).post(`/api/v1/trips/${trip.id}/start`).set("Authorization", ALYA);
  expect(started.status).toBe(200);
  const completed = await request(api).post(`/api/v1/trips/${trip.id}/complete`).set("Authorization", ALYA);
  expect(completed.status).toBe(200);
  return trip;
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

    const trip = await publishPublic(api, "Blocked join");
    const join = await request(api)
      .post(`/api/v1/trips/${trip.id}/join-requests`)
      .set("Authorization", BUDI)
      .set("Idempotency-Key", k("join-blocked"))
      .send({});
    expect(join.status).toBe(403);
    expect(join.body.error.code).toBe("BLOCKED_RELATION");
  });

  it("still rejects self-follow by user id", async () => {
    const { api } = app();
    const self = await request(api)
      .post("/api/v1/users/11111111-1111-4111-8111-111111111111/follow")
      .set("Authorization", ALYA);
    expect(self.status).toBe(400);
    expect(self.body.error.code).toBe("SELF_FOLLOW");
  });

  it("confirms attendance, rejects early review, then accepts one review", async () => {
    const { api } = app();
    const trip = await completeSharedTrip(api, "Review trip");

    const tooSoon = await request(api)
      .post("/api/v1/users/alya/reviews")
      .set("Authorization", BUDI)
      .send({ tripId: trip.id, communication: 5, attitude: 4 });
    expect(tooSoon.status).toBe(409);
    expect(tooSoon.body.error.code).toBe("NOT_ELIGIBLE");

    const hostAttendance = await request(api)
      .post(`/api/v1/trips/${trip.id}/attendance`)
      .set("Authorization", ALYA)
      .send({ confirmed: true });
    expect(hostAttendance.status).toBe(200);
    const guestAttendance = await request(api)
      .post(`/api/v1/trips/${trip.id}/attendance`)
      .set("Authorization", BUDI)
      .send({ confirmed: true });
    expect(guestAttendance.status).toBe(200);

    const self = await request(api)
      .post("/api/v1/users/budi/reviews")
      .set("Authorization", BUDI)
      .send({ tripId: trip.id, communication: 5, attitude: 5 });
    expect(self.status).toBe(400);
    expect(self.body.error.code).toBe("SELF_REVIEW");

    const created = await request(api)
      .post("/api/v1/users/alya/reviews")
      .set("Authorization", BUDI)
      .send({ tripId: trip.id, communication: 5, attitude: 4, comment: "Komunikasi rapi" });
    expect(created.status).toBe(201);

    const duplicate = await request(api)
      .post("/api/v1/users/alya/reviews")
      .set("Authorization", BUDI)
      .send({ tripId: trip.id, communication: 3, attitude: 3 });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe("DUPLICATE_REVIEW");

    const listed = await request(api).get("/api/v1/users/alya/reviews");
    expect(listed.body.data.items).toHaveLength(1);
    expect(listed.body.data.rating.reviewCount).toBe(1);
  });

  it("shows public history only to visitors and all completed trips to the owner", async () => {
    const { api } = app();
    await completeSharedTrip(api, "History public");
    const visitor = await request(api).get("/api/v1/users/alya/history");
    expect(visitor.status).toBe(200);
    expect(visitor.body.data.items.every((row: { visibility: string }) => row.visibility === "PUBLIC")).toBe(true);

    const owner = await request(api).get("/api/v1/users/alya/history").set("Authorization", ALYA);
    expect(owner.body.data.items.length).toBeGreaterThan(0);
  });

  it("creates a report and lets admin hide it", async () => {
    const { api } = app();
    const created = await request(api)
      .post("/api/v1/reports")
      .set("Authorization", ALYA)
      .send({ targetType: "user", targetId: "budi", reason: "spam" });
    expect(created.status).toBe(201);

    const forbidden = await request(api).get("/api/v1/admin/reports").set("Authorization", ALYA);
    expect(forbidden.status).toBe(403);

    const listed = await request(api).get("/api/v1/admin/reports").set("Authorization", ADMIN);
    expect(listed.status).toBe(200);
    expect(listed.body.data.items.some((row: { id: string }) => row.id === created.body.data.id)).toBe(true);

    const hidden = await request(api)
      .post(`/api/v1/admin/reports/${created.body.data.id}/moderate`)
      .set("Authorization", ADMIN)
      .send({ action: "hide" });
    expect(hidden.status).toBe(200);
    expect(hidden.body.data.status).toBe("HIDDEN");
  });
});
