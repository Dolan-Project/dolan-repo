import request from "supertest";
import { describe, expect, it } from "vitest";
import { AuthErrorCode, TripErrorCode } from "@dolan/shared";
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
const UNVERIFIED = "Bearer mock-unverified";

function app(store = new MemoryTripStore()) {
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

async function publishPublic(api: ReturnType<typeof app>["api"], title = "Yogya bareng") {
  const created = await request(api)
    .post("/api/v1/trips")
    .set("Authorization", HOST)
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
    .set("Authorization", HOST)
    .set("Idempotency-Key", k(`publish-${title}`))
    .send({ visibility: "PUBLIC" });
  expect(published.status).toBe(200);
  expect(published.body.data.status).toBe("OPEN");
  expect(published.body.data.joinFree).toBe(true);
  return published.body.data as { id: string };
}

describe("WIRA-D3 trip lifecycle, join, and comments", () => {
  it("creates a draft for a logged-in user and lists it under My Trip hosted", async () => {
    const { api } = app();
    const created = await request(api)
      .post("/api/v1/trips")
      .set("Authorization", HOST)
      .set("Idempotency-Key", k("create-draft"))
      .send({ title: "Draft Yogya", originLabel: "Kos Jakarta" });
    expect(created.status).toBe(201);
    expect(created.body.data.status).toBe("DRAFT");
    expect(created.body.data.privateOriginLabel).toBe("Kos Jakarta");
    expect(created.body.data.startDate).toBeNull();

    const listed = await request(api).get("/api/v1/trips/me?role=hosted").set("Authorization", HOST);
    expect(listed.status).toBe(200);
    expect(listed.body.data.map((trip: { id: string }) => trip.id)).toContain(created.body.data.id);
    const summary = listed.body.data.find((trip: { id: string }) => trip.id === created.body.data.id);
    expect(summary.startDate).toBeNull();
    expect(summary.destinationCity).toBeNull();
    expect(summary.participantCount).toBe(0);
    expect(summary.coverPlace).toBeNull();

    const guest = await request(api).get(`/api/v1/trips/${created.body.data.id}`);
    expect(guest.status).toBe(404);
  });

  it("retries create with the same idempotency key without duplicating trips", async () => {
    const { api } = app();
    const payload = { title: "Sekali saja" };
    const first = await request(api)
      .post("/api/v1/trips")
      .set("Authorization", HOST)
      .set("Idempotency-Key", k("same-key"))
      .send(payload);
    const retry = await request(api)
      .post("/api/v1/trips")
      .set("Authorization", HOST)
      .set("Idempotency-Key", k("same-key"))
      .send(payload);
    expect(retry.body.data.id).toBe(first.body.data.id);
    const listed = await request(api).get("/api/v1/trips/me").set("Authorization", HOST);
    expect(listed.body.data).toHaveLength(1);
  });

  it("publishes host membership and chat atomically, then accepts one join without exceeding capacity", async () => {
    const { api, store } = app();
    const trip = await publishPublic(api);
    expect(store.chatRooms.has(trip.id)).toBe(true);
    expect(store.members.some((member) => member.tripId === trip.id && member.role === "HOST")).toBe(true);

    const hostJoin = await request(api)
      .post(`/api/v1/trips/${trip.id}/join-requests`)
      .set("Authorization", HOST)
      .set("Idempotency-Key", k("host-join"))
      .send({});
    expect(hostJoin.status).toBe(403);

    const join = await request(api)
      .post(`/api/v1/trips/${trip.id}/join-requests`)
      .set("Authorization", BUDDI)
      .set("Idempotency-Key", k("budi-join"))
      .send({ message: "Ikut ya" });
    expect(join.status).toBe(201);
    expect(join.body.data.status).toBe("PENDING");

    const duplicate = await request(api)
      .post(`/api/v1/trips/${trip.id}/join-requests`)
      .set("Authorization", BUDDI)
      .set("Idempotency-Key", k("budi-join-2"))
      .send({ message: "Ikut ya" });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.error.code).toBe(TripErrorCode.DUPLICATE_REQUEST);

    const pendingList = await request(api).get("/api/v1/trips/me?role=pending").set("Authorization", BUDDI);
    expect(pendingList.body.data[0].id).toBe(trip.id);

    const hostQueue = await request(api).get(`/api/v1/trips/${trip.id}/join-requests`).set("Authorization", HOST);
    expect(hostQueue.status).toBe(200);
    expect(hostQueue.body.data).toHaveLength(1);

    const accepted = await request(api)
      .post(`/api/v1/join-requests/${join.body.data.id}/review`)
      .set("Authorization", HOST)
      .set("Idempotency-Key", k("accept-budi"))
      .send({ decision: "accept" });
    expect(accepted.status).toBe(200);
    expect(accepted.body.data.status).toBe("ACCEPTED");

    const joined = await request(api).get("/api/v1/trips/me?role=joined").set("Authorization", BUDDI);
    expect(joined.body.data[0].id).toBe(trip.id);
  });

  it("rejects a second approval that would exceed capacity", async () => {
    const { api } = app();
    const trip = await publishPublic(api, "Kursi terakhir");
    const first = await request(api)
      .post(`/api/v1/trips/${trip.id}/join-requests`)
      .set("Authorization", BUDDI)
      .set("Idempotency-Key", k("seat-1"))
      .send({});
    const second = await request(api)
      .post(`/api/v1/trips/${trip.id}/join-requests`)
      .set("Authorization", "Bearer mock-admin")
      .set("Idempotency-Key", k("seat-2"))
      .send({});
    await request(api)
      .post(`/api/v1/join-requests/${first.body.data.id}/review`)
      .set("Authorization", HOST)
      .set("Idempotency-Key", k("accept-1"))
      .send({ decision: "accept" });
    const overflow = await request(api)
      .post(`/api/v1/join-requests/${second.body.data.id}/review`)
      .set("Authorization", HOST)
      .set("Idempotency-Key", k("accept-2"))
      .send({ decision: "accept" });
    expect(overflow.status).toBe(409);
    expect(overflow.body.error.code).toBe(TripErrorCode.TRIP_FULL);
  });

  it("blocks join across a block relationship and keeps pending out of chat membership", async () => {
    const { api, store } = app();
    const trip = await publishPublic(api, "Blocked");
    await store.addBlock("11111111-1111-4111-8111-111111111111", "55555555-5555-4555-8555-555555555555");
    const join = await request(api)
      .post(`/api/v1/trips/${trip.id}/join-requests`)
      .set("Authorization", BUDDI)
      .set("Idempotency-Key", k("blocked-join"))
      .send({});
    expect(join.status).toBe(403);
    expect(join.body.error.code).toBe(TripErrorCode.BLOCKED_RELATION);
  });

  it("rejects public to private while participants or pending remain", async () => {
    const { api } = app();
    const trip = await publishPublic(api, "Keep public");
    await request(api)
      .post(`/api/v1/trips/${trip.id}/join-requests`)
      .set("Authorization", BUDDI)
      .set("Idempotency-Key", k("pending-vis"))
      .send({});
    const hidden = await request(api)
      .post(`/api/v1/trips/${trip.id}/visibility`)
      .set("Authorization", HOST)
      .send({ visibility: "PRIVATE" });
    expect(hidden.status).toBe(400);
    expect(hidden.body.error.code).toBe(TripErrorCode.INVALID_TRANSITION);
  });

  it("cancels without deleting history and makes chat read-only", async () => {
    const { api, store } = app();
    const trip = await publishPublic(api, "Cancel me");
    const cancelled = await request(api).post(`/api/v1/trips/${trip.id}/cancel`).set("Authorization", HOST);
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.data.status).toBe("CANCELLED");
    const detail = await request(api).get(`/api/v1/trips/${trip.id}`);
    expect(detail.status).toBe(200);
    expect(store.chatRooms.get(trip.id)?.readOnlyAt).toBeTruthy();
  });

  it("lets a participant leave and lose membership plus location share", async () => {
    const { api, store } = app();
    const trip = await publishPublic(api, "Leave me");
    const join = await request(api)
      .post(`/api/v1/trips/${trip.id}/join-requests`)
      .set("Authorization", BUDDI)
      .set("Idempotency-Key", k("leave-join"))
      .send({});
    await request(api)
      .post(`/api/v1/join-requests/${join.body.data.id}/review`)
      .set("Authorization", HOST)
      .set("Idempotency-Key", k("leave-accept"))
      .send({ decision: "accept" });
    const left = await request(api).post(`/api/v1/trips/${trip.id}/leave`).set("Authorization", BUDDI);
    expect(left.status).toBe(200);
    const member = store.members.find((row) => row.userId === "55555555-5555-4555-8555-555555555555");
    expect(member?.membershipStatus).toBe("LEFT");
    expect(store.usages.some((row) => row.tripId === trip.id && row.revokedAt)).toBe(true);
  });

  it("allows comments and one-level replies on public trips, including pending applicants", async () => {
    const { api } = app();
    const trip = await publishPublic(api, "Comment thread");
    await request(api)
      .post(`/api/v1/trips/${trip.id}/join-requests`)
      .set("Authorization", BUDDI)
      .set("Idempotency-Key", k("comment-join"))
      .send({});
    const comment = await request(api)
      .post(`/api/v1/trips/${trip.id}/comments`)
      .set("Authorization", BUDDI)
      .set("Idempotency-Key", k("c1"))
      .send({ body: "Join gratis ya" });
    expect(comment.status).toBe(201);
    const reply = await request(api)
      .post(`/api/v1/trips/${trip.id}/comments`)
      .set("Authorization", HOST)
      .set("Idempotency-Key", k("c2"))
      .send({ body: "Sip", parentId: comment.body.data.id });
    expect(reply.status).toBe(201);
    const nested = await request(api)
      .post(`/api/v1/trips/${trip.id}/comments`)
      .set("Authorization", BUDDI)
      .set("Idempotency-Key", k("c3"))
      .send({ body: "too deep", parentId: reply.body.data.id });
    expect(nested.status).toBe(400);
    expect(nested.body.error.code).toBe(TripErrorCode.INVALID_PARENT);
    const listed = await request(api).get(`/api/v1/trips/${trip.id}/comments`);
    expect(listed.body.data).toHaveLength(2);
  });

  it("does not block publish on missing email verification and rejects comments without login", async () => {
    const { api } = app();
    const draft = await request(api)
      .post("/api/v1/trips")
      .set("Authorization", UNVERIFIED)
      .set("Idempotency-Key", k("uv-draft"))
      .send({ title: "Belum verifikasi" });
    const publish = await request(api)
      .post(`/api/v1/trips/${draft.body.data.id}/publish`)
      .set("Authorization", UNVERIFIED)
      .set("Idempotency-Key", k("uv-pub"))
      .send({ visibility: "PUBLIC", maxParticipants: 4, publicMeetingPointLabel: "Tugu" });
    expect(publish.body.error?.code).not.toBe("EMAIL_UNVERIFIED");
    const comment = await request(api).post("/api/v1/trips/nope/comments").send({ body: "hi" });
    expect(comment.status).toBe(401);
  });

  it("publishes a private trip as CLOSED and rejects public publish without a destination", async () => {
    const { api } = app();
    const privateDraft = await request(api)
      .post("/api/v1/trips")
      .set("Authorization", HOST)
      .set("Idempotency-Key", k("private-draft"))
      .send({ title: "Private only" });
    const published = await request(api)
      .post(`/api/v1/trips/${privateDraft.body.data.id}/publish`)
      .set("Authorization", HOST)
      .set("Idempotency-Key", k("private-pub"))
      .send({ visibility: "PRIVATE" });
    expect(published.status).toBe(200);
    expect(published.body.data.status).toBe("CLOSED");
    expect(published.body.data.visibility).toBe("PRIVATE");

    const publicDraft = await request(api)
      .post("/api/v1/trips")
      .set("Authorization", HOST)
      .set("Idempotency-Key", k("public-no-city"))
      .send({ title: "No city", maxParticipants: 4, publicMeetingPointLabel: "Tugu" });
    const missingCity = await request(api)
      .post(`/api/v1/trips/${publicDraft.body.data.id}/publish`)
      .set("Authorization", HOST)
      .set("Idempotency-Key", k("public-no-city-pub"))
      .send({ visibility: "PUBLIC" });
    expect(missingCity.status).toBe(400);
    expect(missingCity.body.error.code).toBe(TripErrorCode.INVALID_PLAN_INPUT);
  });

  it("closes, reopens, starts, and completes a public trip and notifies other members", async () => {
    const { api, store } = app();
    const trip = await publishPublic(api, "Lifecycle");
    const join = await request(api)
      .post(`/api/v1/trips/${trip.id}/join-requests`)
      .set("Authorization", BUDDI)
      .set("Idempotency-Key", k("life-join"))
      .send({});
    await request(api)
      .post(`/api/v1/join-requests/${join.body.data.id}/review`)
      .set("Authorization", HOST)
      .set("Idempotency-Key", k("life-accept"))
      .send({ decision: "accept" });

    const closed = await request(api).post(`/api/v1/trips/${trip.id}/close`).set("Authorization", HOST);
    expect(closed.status).toBe(200);
    expect(closed.body.data.status).toBe("CLOSED");
    expect(store.notifications.some((row) => row.type === "trip.updated" && row.recipientUserId === "55555555-5555-4555-8555-555555555555")).toBe(true);

    const reopened = await request(api).post(`/api/v1/trips/${trip.id}/reopen`).set("Authorization", HOST);
    expect(reopened.body.data.status).toBe("OPEN");
    const started = await request(api).post(`/api/v1/trips/${trip.id}/start`).set("Authorization", HOST);
    expect(started.body.data.status).toBe("ONGOING");
    const completed = await request(api).post(`/api/v1/trips/${trip.id}/complete`).set("Authorization", HOST);
    expect(completed.body.data.status).toBe("COMPLETED");
  });

  it("lets the applicant withdraw a pending join and the host delete a draft", async () => {
    const { api } = app();
    const trip = await publishPublic(api, "Withdraw me");
    const join = await request(api)
      .post(`/api/v1/trips/${trip.id}/join-requests`)
      .set("Authorization", BUDDI)
      .set("Idempotency-Key", k("withdraw-join"))
      .send({});
    const withdrawn = await request(api)
      .post(`/api/v1/join-requests/${join.body.data.id}/withdraw`)
      .set("Authorization", BUDDI);
    expect(withdrawn.status).toBe(200);
    expect(withdrawn.body.data.status).toBe("WITHDRAWN");
    const pending = await request(api).get("/api/v1/trips/me?role=pending").set("Authorization", BUDDI);
    expect(pending.body.data).toHaveLength(0);

    const draft = await request(api)
      .post("/api/v1/trips")
      .set("Authorization", HOST)
      .set("Idempotency-Key", k("delete-draft"))
      .send({ title: "Buang draft" });
    const deleted = await request(api).delete(`/api/v1/trips/${draft.body.data.id}`).set("Authorization", HOST);
    expect(deleted.status).toBe(200);
    const missing = await request(api).get(`/api/v1/trips/${draft.body.data.id}`).set("Authorization", HOST);
    expect(missing.status).toBe(404);
  });

  it("returns 403 NOT_HOST on a known public trip and 404 on a private trip the actor does not know", async () => {
    const { api } = app();
    const publicTrip = await publishPublic(api, "Known public");
    const cancelled = await request(api).post(`/api/v1/trips/${publicTrip.id}/cancel`).set("Authorization", BUDDI);
    expect(cancelled.status).toBe(403);
    expect(cancelled.body.error.code).toBe(AuthErrorCode.NOT_HOST);

    const patched = await request(api)
      .patch(`/api/v1/trips/${publicTrip.id}`)
      .set("Authorization", BUDDI)
      .send({ title: "Hijack" });
    expect(patched.status).toBe(403);
    expect(patched.body.error.code).toBe(AuthErrorCode.NOT_HOST);

    const leave = await request(api).post(`/api/v1/trips/${publicTrip.id}/leave`).set("Authorization", BUDDI);
    expect(leave.status).toBe(403);
    expect(leave.body.error.code).toBe(AuthErrorCode.NOT_MEMBER);

    const draft = await request(api)
      .post("/api/v1/trips")
      .set("Authorization", HOST)
      .set("Idempotency-Key", k("secret-draft"))
      .send({ title: "Rahasia" });
    const hidden = await request(api).post(`/api/v1/trips/${draft.body.data.id}/cancel`).set("Authorization", BUDDI);
    expect(hidden.status).toBe(404);
    expect(hidden.body.error.code).toBe(TripErrorCode.TRIP_NOT_FOUND);

    const hiddenQueue = await request(api)
      .get(`/api/v1/trips/${draft.body.data.id}/join-requests`)
      .set("Authorization", BUDDI);
    expect(hiddenQueue.status).toBe(404);
    expect(hiddenQueue.body.error.code).toBe(TripErrorCode.TRIP_NOT_FOUND);

    const publicQueue = await request(api)
      .get(`/api/v1/trips/${publicTrip.id}/join-requests`)
      .set("Authorization", BUDDI);
    expect(publicQueue.status).toBe(403);
    expect(publicQueue.body.error.code).toBe(AuthErrorCode.NOT_HOST);

    const missingReview = await request(api)
      .post("/api/v1/join-requests/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/review")
      .set("Authorization", HOST)
      .set("Idempotency-Key", k("missing-review"))
      .send({ decision: "accept" });
    expect(missingReview.status).toBe(404);
    expect(missingReview.body.error.code).toBe(TripErrorCode.TRIP_NOT_FOUND);
  });

  it("maps invalid dates and budget to dedicated error codes", async () => {
    const { api } = app();
    const dates = await request(api)
      .post("/api/v1/trips")
      .set("Authorization", HOST)
      .set("Idempotency-Key", k("bad-dates"))
      .send({ title: "Tanggal salah", startDate: "2026-10-03", endDate: "2026-10-01" });
    expect(dates.status).toBe(400);
    expect(dates.body.error.code).toBe(TripErrorCode.INVALID_DATE);

    const budget = await request(api)
      .post("/api/v1/trips")
      .set("Authorization", HOST)
      .set("Idempotency-Key", k("bad-budget"))
      .send({ title: "Budget salah", budgetAmount: "abc" });
    expect(budget.status).toBe(400);
    expect(budget.body.error.code).toBe(TripErrorCode.INVALID_BUDGET);

    const filter = await request(api).get("/api/v1/trips/me?role=maybe").set("Authorization", HOST);
    expect(filter.status).toBe(400);
    expect(filter.body.error.code).toBe(TripErrorCode.INVALID_FILTER);
  });

  it("lets the author edit a comment and the host soft-delete it", async () => {
    const { api } = app();
    const trip = await publishPublic(api, "Edit comment");
    const comment = await request(api)
      .post(`/api/v1/trips/${trip.id}/comments`)
      .set("Authorization", BUDDI)
      .set("Idempotency-Key", k("edit-c1"))
      .send({ body: "Versi awal" });
    const edited = await request(api)
      .patch(`/api/v1/trips/${trip.id}/comments/${comment.body.data.id}`)
      .set("Authorization", BUDDI)
      .send({ body: "Versi baru" });
    expect(edited.status).toBe(200);
    expect(edited.body.data.body).toBe("Versi baru");

    const removed = await request(api)
      .delete(`/api/v1/trips/${trip.id}/comments/${comment.body.data.id}`)
      .set("Authorization", HOST);
    expect(removed.status).toBe(200);
    const listed = await request(api).get(`/api/v1/trips/${trip.id}/comments`);
    expect(listed.body.data).toHaveLength(0);
  });

  it("returns origin coordinates and preferences only to the host", async () => {
    const { api } = app();
    const created = await request(api)
      .post("/api/v1/trips")
      .set("Authorization", HOST)
      .set("Idempotency-Key", k("origin-prefs"))
      .send({
        title: "Asal pribadi",
        originLabel: "Kos Jakarta",
        originLatitude: -6.2,
        originLongitude: 106.8,
        preferences: { pace: "slow" },
        visibility: "PUBLIC",
        startDate: "2026-10-01",
        endDate: "2026-10-03",
        destinationCity: "Yogyakarta",
        maxParticipants: 2,
        publicMeetingPointLabel: "Stasiun Tugu",
      });
    expect(created.status).toBe(201);
    expect(created.body.data.privateOriginLatitude).toBe(-6.2);
    expect(created.body.data.privateOriginLongitude).toBe(106.8);
    expect(created.body.data.preferences).toEqual({ pace: "slow" });

    const published = await request(api)
      .post(`/api/v1/trips/${created.body.data.id}/publish`)
      .set("Authorization", HOST)
      .set("Idempotency-Key", k("origin-prefs-pub"))
      .send({ visibility: "PUBLIC" });
    expect(published.status).toBe(200);

    const guest = await request(api).get(`/api/v1/trips/${created.body.data.id}`);
    expect(guest.status).toBe(200);
    expect(guest.body.data.privateOriginLabel).toBeNull();
    expect(guest.body.data.privateOriginLatitude).toBeNull();
    expect(guest.body.data.preferences).toBeNull();

    const hostView = await request(api).get(`/api/v1/trips/${created.body.data.id}`).set("Authorization", HOST);
    expect(hostView.body.data.privateOriginLatitude).toBe(-6.2);
    expect(hostView.body.data.preferences).toEqual({ pace: "slow" });
  });

  it("rejects a non-UUID idempotency key and returns cover places on My Trip", async () => {
    const { api, store } = app();
    const invalid = await request(api)
      .post("/api/v1/trips")
      .set("Authorization", HOST)
      .set("Idempotency-Key", "bukan-uuid")
      .send({ title: "Key salah" });
    expect(invalid.status).toBe(400);
    expect(invalid.body.error.code).toBe(TripErrorCode.INVALID_PLAN_INPUT);

    const created = await request(api)
      .post("/api/v1/trips")
      .set("Authorization", HOST)
      .set("Idempotency-Key", k("cover-draft"))
      .send({ title: "Pakai cover" });
    store.setCoverPlace(created.body.data.id, {
      googlePlaceId: "ChIJ-cover",
      name: "Malioboro",
      formattedAddress: null,
      city: "Yogyakarta",
      latitude: -7.79,
      longitude: 110.36,
      rating: null,
      userRatingCount: null,
      photoName: null,
      googleMapsUrl: null,
    });
    const listed = await request(api).get("/api/v1/trips/me").set("Authorization", HOST);
    const summary = listed.body.data.find((trip: { id: string }) => trip.id === created.body.data.id);
    expect(summary.coverPlace.name).toBe("Malioboro");
  });

  it("changes visibility without notifying the host about their own action", async () => {
    const { api, store } = app();
    const draft = await request(api)
      .post("/api/v1/trips")
      .set("Authorization", HOST)
      .set("Idempotency-Key", k("vis-draft"))
      .send({
        title: "Private dulu",
        destinationCity: "Yogyakarta",
        maxParticipants: 2,
        publicMeetingPointLabel: "Tugu",
      });
    await request(api)
      .post(`/api/v1/trips/${draft.body.data.id}/publish`)
      .set("Authorization", HOST)
      .set("Idempotency-Key", k("vis-pub"))
      .send({ visibility: "PRIVATE" });
    const opened = await request(api)
      .post(`/api/v1/trips/${draft.body.data.id}/visibility`)
      .set("Authorization", HOST)
      .send({
        visibility: "PUBLIC",
        destinationCity: "Yogyakarta",
        maxParticipants: 2,
        publicMeetingPointLabel: "Tugu",
      });
    expect(opened.status).toBe(200);
    expect(opened.body.data.visibility).toBe("PUBLIC");
    expect(opened.body.data.status).toBe("OPEN");
    expect(store.notifications.filter((row) => row.type === "trip.updated")).toHaveLength(0);
  });
});
