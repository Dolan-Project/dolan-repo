import request from "supertest";
import { describe, expect, it } from "vitest";
import { TripErrorCode } from "@dolan/shared";
import { createApp } from "../src/app.ts";
import { createJobService, createMemorySearchService } from "../src/container.ts";
import { MockAuthAdapter } from "../src/integrations/supabase/mock-auth-adapter.ts";
import { AuthService } from "../src/modules/auth/auth-service.ts";
import { MemoryUserRepository } from "../src/modules/auth/user-repository.ts";
import { MemoryTripStore } from "../src/modules/trips/memory-store.ts";
import { TripService } from "../src/modules/trips/trip-service.ts";
import { idempotencyKey as k } from "./idempotency-key.ts";

const HOST = "Bearer mock-verified-complete";
const BUDDI = "Bearer mock-verified-budi";
const ADMIN = "Bearer mock-admin";

function app() {
  const store = new MemoryTripStore();
  return {
    store,
    api: createApp(
      new AuthService(new MockAuthAdapter(), new MemoryUserRepository()),
      () => 0,
      createMemorySearchService(),
      createJobService(),
      new TripService(store),
    ),
  };
}

describe("WIRA-D4 concurrent approval", () => {
  it("does not overbook the last seat when two accepts run together", async () => {
    const { api, store } = app();
    const created = await request(api)
      .post("/api/v1/trips")
      .set("Authorization", HOST)
      .set("Idempotency-Key", k("conc-create"))
      .send({
        title: "Satu kursi",
        visibility: "PUBLIC",
        startDate: "2026-11-01",
        endDate: "2026-11-03",
        destinationCity: "Yogyakarta",
        maxParticipants: 2,
        publicMeetingPointLabel: "Tugu",
      });
    await request(api)
      .post(`/api/v1/trips/${created.body.data.id}/publish`)
      .set("Authorization", HOST)
      .set("Idempotency-Key", k("conc-publish"))
      .send({ visibility: "PUBLIC" });

    const first = await request(api)
      .post(`/api/v1/trips/${created.body.data.id}/join-requests`)
      .set("Authorization", BUDDI)
      .set("Idempotency-Key", k("conc-join-1"))
      .send({});
    const second = await request(api)
      .post(`/api/v1/trips/${created.body.data.id}/join-requests`)
      .set("Authorization", ADMIN)
      .set("Idempotency-Key", k("conc-join-2"))
      .send({});

    const [a, b] = await Promise.all([
      request(api)
        .post(`/api/v1/join-requests/${first.body.data.id}/review`)
        .set("Authorization", HOST)
        .set("Idempotency-Key", k("conc-accept-1"))
        .send({ decision: "accept" }),
      request(api)
        .post(`/api/v1/join-requests/${second.body.data.id}/review`)
        .set("Authorization", HOST)
        .set("Idempotency-Key", k("conc-accept-2"))
        .send({ decision: "accept" }),
    ]);

    const statuses = [a.status, b.status].sort();
    expect(statuses).toEqual([200, 409]);
    const failed = a.status === 409 ? a : b;
    expect(failed.body.error.code).toBe(TripErrorCode.TRIP_FULL);
    expect(store.countActive(created.body.data.id)).toBe(2);
  });
});
