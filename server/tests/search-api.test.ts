import request from "supertest";
import { describe, expect, it } from "vitest";
import { SearchErrorCode } from "@dolan/shared";
import { createApp } from "../src/app.ts";
import { createMemorySearchService } from "../src/container.ts";
import { FakePlacesClient } from "../src/integrations/google/fake-places-client.ts";
import { providerUnavailable } from "../src/lib/api-error.ts";
import { MockAuthAdapter } from "../src/integrations/supabase/mock-auth-adapter.ts";
import { AuthService } from "../src/modules/auth/auth-service.ts";
import { MemoryUserRepository } from "../src/modules/auth/user-repository.ts";
import { MEMORY_PLACE_MALIOBORO, MEMORY_TEMPLATE_ID, MemorySearchStore } from "../src/modules/search/memory-store.ts";

function app(search = createMemorySearchService()) {
  return createApp(new AuthService(new MockAuthAdapter(), new MemoryUserRepository()), () => 0, search);
}

describe("WIRA-D2 search and popularity APIs", () => {
  it("ranks tourist destinations above hotels and normalizes city names", async () => {
    const response = await request(app()).get("/api/v1/search/places?q=malioboro&city=Kota%20Yogyakarta");
    expect(response.status).toBe(200);
    const names = response.body.data.map((place: { name: string }) => place.name);
    expect(names[0]).toBe("Malioboro");
    expect(names).toContain("Hotel Malioboro Inn Yogyakarta");
    expect(names[names.length - 1]).toBe("Hotel Malioboro Inn Yogyakarta");
    expect(response.body.data.every((place: { city: string }) => place.city === "Yogyakarta")).toBe(true);
  });

  it("ranks Dolan destination popularity first", async () => {
    const response = await request(app()).get("/api/v1/search/places?q=wisata&city=Yogyakarta&sort=popular");
    expect(response.status).toBe(200);
    expect(response.body.data[0].name).toBe("Malioboro");
    expect(response.body.data[0].visitCount).toBe(1);
  });

  it("sorts places by nearest coordinates", async () => {
    const response = await request(app()).get(
      "/api/v1/search/places?q=wisata&city=Yogyakarta&sort=nearest&lat=-7.752&lng=110.4915",
    );
    expect(response.status).toBe(200);
    expect(response.body.data[0].name).toBe("Candi Prambanan");
  });

  it("rejects nearest sort without coordinates", async () => {
    const response = await request(app()).get("/api/v1/search/places?q=malioboro&sort=nearest");
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe(SearchErrorCode.INVALID_FILTER);
  });

  it("exposes city candidates for Indonesia", async () => {
    const response = await request(app()).get("/api/v1/search/cities?q=yogya");
    expect(response.status).toBe(200);
    expect(response.body.data.some((city: { name: string }) => city.name === "Yogyakarta")).toBe(true);
  });

  it("hides private trips from public search", async () => {
    const response = await request(app()).get("/api/v1/search/trips?city=Yogyakarta");
    expect(response.status).toBe(200);
    const ids = response.body.data.map((trip: { id: string }) => trip.id);
    expect(ids).toContain("public-trip-1");
    expect(ids).not.toContain("private-trip-1");
  });

  it("returns each public trip once when a place appears twice on the itinerary", async () => {
    const store = new MemorySearchStore();
    const original = store.trips.find((item) => item.id === "public-trip-1");
    if (!original) throw new Error("missing seeded public trip");
    store.trips.push({
      ...original,
      visitingGooglePlaceIds: [...original.visitingGooglePlaceIds, MEMORY_PLACE_MALIOBORO.googlePlaceId],
    });
    const search = createMemorySearchService({ store });
    const response = await request(app(search)).get(
      `/api/v1/places/${MEMORY_PLACE_MALIOBORO.googlePlaceId}/trips`,
    );
    expect(response.status).toBe(200);
    const ids = response.body.data.map((item: { id: string }) => item.id);
    expect(ids.filter((id: string) => id === "public-trip-1")).toHaveLength(1);
  });

  it("sorts trips by soonest departure and keeps recent as an alias", async () => {
    const store = new MemorySearchStore();
    const later = store.trips.find((item) => item.id === "public-trip-1");
    if (!later) throw new Error("missing seeded public trip");
    later.startDate = "2099-12-01";
    store.trips.push({
      ...later,
      id: "public-trip-soon",
      title: "Berangkat Lebih Cepat",
      startDate: "2099-10-01",
      endDate: "2099-10-03",
      visitingGooglePlaceIds: [],
    });
    const search = createMemorySearchService({ store });
    const soonest = await request(app(search)).get("/api/v1/search/trips?city=Yogyakarta&sort=soonest");
    const recent = await request(app(search)).get("/api/v1/search/trips?city=Yogyakarta&sort=recent");
    expect(soonest.status).toBe(200);
    expect(soonest.body.data.map((item: { id: string }) => item.id).slice(0, 2)).toEqual([
      "public-trip-soon",
      "public-trip-1",
    ]);
    expect(recent.body.data[0].id).toBe("public-trip-soon");
  });

  it("sorts trips by nearest public meeting point", async () => {
    const store = new MemorySearchStore();
    const malioboro = store.trips.find((item) => item.id === "public-trip-1");
    if (!malioboro) throw new Error("missing seeded public trip");
    store.trips.push({
      ...malioboro,
      id: "public-trip-prambanan",
      title: "Prambanan Sunrise",
      publicMeetingPointLabel: "Candi Prambanan",
      publicMeetingPointLatitude: -7.752,
      publicMeetingPointLongitude: 110.4915,
      visitingGooglePlaceIds: ["ChIJf5UqGYeXeY4RwZVQ9n0s7oE"],
    });
    const search = createMemorySearchService({ store });
    const response = await request(app(search)).get(
      "/api/v1/search/trips?city=Yogyakarta&sort=nearest&lat=-7.752&lng=110.4915",
    );
    expect(response.status).toBe(200);
    expect(response.body.data[0].id).toBe("public-trip-prambanan");
    expect(response.body.data[0].publicMeetingPointLatitude).toBe(-7.752);
  });

  it("rejects trip nearest sort without coordinates", async () => {
    const response = await request(app()).get("/api/v1/search/trips?sort=nearest");
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe(SearchErrorCode.INVALID_FILTER);
  });

  it("sorts trips by Dolan popularity", async () => {
    const store = new MemorySearchStore();
    const seeded = store.trips.find((item) => item.id === "public-trip-1");
    if (!seeded) throw new Error("missing seeded public trip");
    store.trips.push({
      ...seeded,
      id: "public-trip-busy",
      title: "Trip Ramai",
      participantCount: 12,
      visitingGooglePlaceIds: [],
    });
    const search = createMemorySearchService({ store });
    const response = await request(app(search)).get("/api/v1/search/trips?city=Yogyakarta&sort=popular");
    expect(response.status).toBe(200);
    expect(response.body.data[0].id).toBe("public-trip-busy");
  });

  it("labels curated templates and does not mark unused templates as popular", async () => {
    const response = await request(app()).get("/api/v1/templates?city=Yogyakarta");
    expect(response.status).toBe(200);
    expect(response.body.data[0].sourceLabel).toBe("Kurasi Dolan");
    expect(response.body.data[0].popularityLabel).toBeNull();
    expect(response.body.data[0].usageCount).toBe(0);
  });

  it("does not increment usage when a template is only viewed", async () => {
    const store = new MemorySearchStore();
    const search = createMemorySearchService({ store });
    const before = await request(app(search)).get(`/api/v1/templates/${MEMORY_TEMPLATE_ID}`);
    expect(before.status).toBe(200);
    expect(before.body.data.usageCount).toBe(0);

    const after = await request(app(search)).get("/api/v1/templates?city=Yogyakarta");
    expect(after.body.data[0].usageCount).toBe(0);
    expect(after.body.data[0].popularityLabel).toBeNull();
  });

  it("copies a template into a draft once and ignores retry with the same idempotency key", async () => {
    const store = new MemorySearchStore();
    const search = createMemorySearchService({ store });
    const payload = { startDate: "2026-11-01", planningPartySize: 2 };

    const first = await request(app(search))
      .post(`/api/v1/templates/${MEMORY_TEMPLATE_ID}/use`)
      .set("Authorization", "Bearer mock-verified-complete")
      .set("Idempotency-Key", "use-yogya-1")
      .send(payload);
    expect(first.status).toBe(201);
    const tripId = first.body.data.tripId;

    const retry = await request(app(search))
      .post(`/api/v1/templates/${MEMORY_TEMPLATE_ID}/use`)
      .set("Authorization", "Bearer mock-verified-complete")
      .set("Idempotency-Key", "use-yogya-1")
      .send(payload);
    expect(retry.status).toBe(201);
    expect(retry.body.data.tripId).toBe(tripId);

    const listed = await request(app(search)).get("/api/v1/templates?city=Yogyakarta");
    expect(listed.body.data[0].usageCount).toBe(1);
    expect(listed.body.data[0].popularityLabel).toBe("Populer di Dolan");
    expect(store.usages).toHaveLength(1);
  });

  it("rejects use-template without an idempotency key", async () => {
    const response = await request(app())
      .post(`/api/v1/templates/${MEMORY_TEMPLATE_ID}/use`)
      .set("Authorization", "Bearer mock-verified-complete")
      .send({ startDate: "2026-11-01" });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe(SearchErrorCode.INVALID_PLAN_INPUT);
  });

  it("maps provider failures to PROVIDER_UNAVAILABLE", async () => {
    const search = createMemorySearchService({
      placesProvider: new FakePlacesClient(undefined, providerUnavailable(SearchErrorCode.PROVIDER_UNAVAILABLE, "down")),
    });
    const response = await request(app(search)).get("/api/v1/search/places?q=malioboro");
    expect(response.status).toBe(502);
    expect(response.body.error.code).toBe(SearchErrorCode.PROVIDER_UNAVAILABLE);
  });

  it("does not block Places searches with a per-user daily quota", async () => {
    const search = createMemorySearchService({ quotaLimit: 1 });
    const first = await request(app(search)).get("/api/v1/search/places?q=malioboro");
    expect(first.status).toBe(200);
    const next = await request(app(search)).get("/api/v1/search/places?q=prambanan");
    expect(next.status).toBe(200);
  });

  it("accepts Google photo resource names longer than 200 characters", async () => {
    const placeId = "ChIJxYBx6Da5eY4R2lX2sQ0oYkA";
    const name = `places/${placeId}/photos/${"A".repeat(220)}`;
    const response = await request(app()).get(`/api/v1/places/${placeId}/photo`).query({ name });
    expect(response.status).toBe(200);
    expect(response.body.data.photoUri).toContain("googleusercontent.com");
  });
});
