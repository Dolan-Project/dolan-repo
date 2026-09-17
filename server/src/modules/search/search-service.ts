import { createHash } from "node:crypto";
import {
  SearchErrorCode,
  apiPage,
  type PlaceSearchQuery,
  type PlaceSummary,
  type SessionActor,
  type TemplateSearchQuery,
  type TripSearchQuery,
  type UseTemplateBody,
  type UseTemplateResult,
} from "@dolan/shared";
import { badRequest, conflict, notFound, unauthorized } from "../../lib/api-error.ts";
import type { PlacesProvider } from "../../integrations/google/places-client.ts";
import { searchIndonesiaCities, normalizeCityName } from "./city-catalog.ts";
import { destinationScore, distanceKm, isAdministrativePlace } from "./place-rank.ts";
import { runWithPlacesQuotaUser } from "./places-quota-context.ts";
import type { SearchStore } from "./types.ts";

const PHOTO_NAME_PATTERN = /^places\/[^/]+\/photos\/.+/;
const CITY_PATTERN = /^[\p{L}\s.'-]+$/u;
const USE_TEMPLATE_OPERATION = "templates.use";

export class SearchService {
  constructor(
    private readonly placesProvider: PlacesProvider,
    private readonly store: SearchStore,
  ) {}

  async searchCities(q?: string) {
    const extra = await this.store.listKnownCities();
    return searchIndonesiaCities(q, extra);
  }

  async searchPlaces(query: PlaceSearchQuery, actor: SessionActor) {
    const city = normalizeCityName(query.city) ?? query.city;
    if (query.sort === "nearest" && (query.lat === undefined || query.lng === undefined)) {
      throw badRequest(SearchErrorCode.INVALID_FILTER, "Nearest sort requires lat and lng", {
        lat: "Required for sort=nearest",
        lng: "Required for sort=nearest",
      });
    }
    return runWithPlacesQuotaUser(actorUserId(actor), async () => {
      const places = (await this.placesProvider.searchText({
        query: query.q,
        city,
        latitude: query.lat,
        longitude: query.lng,
        sort: query.sort,
      })).map((place) => ({ ...place, city: normalizeCityName(place.city) ?? place.city }))
        .filter((place) => !isAdministrativePlace(place));
      await this.store.cachePlaces(places);
      const ranked = await this.withVisitCounts(places);
      const sorted = sortPlaces(ranked, query.sort, query.lat, query.lng);
      const start = (query.page - 1) * query.limit;
      return apiPage(sorted.slice(start, start + query.limit), query.page, query.limit, sorted.length);
    });
  }

  async searchTrips(query: TripSearchQuery) {
    const city = normalizeCityName(query.city) ?? query.city;
    this.assertCity(city);
    if (query.sort === "nearest" && (query.lat === undefined || query.lng === undefined)) {
      throw badRequest(SearchErrorCode.INVALID_FILTER, "Nearest sort requires lat and lng", {
        lat: "Required for sort=nearest",
        lng: "Required for sort=nearest",
      });
    }
    const result = await this.store.searchPublicTrips({ ...query, city });
    return apiPage(result.items, query.page, query.limit, result.total);
  }

  async searchTemplates(query: TemplateSearchQuery) {
    const city = normalizeCityName(query.city) ?? query.city;
    this.assertCity(city, true);
    const result = await this.store.searchTemplates({ ...query, city });
    return apiPage(result.items, query.page, query.limit, result.total);
  }

  async getPlace(googlePlaceId: string, actor: SessionActor) {
    return runWithPlacesQuotaUser(actorUserId(actor), async () => {
      const details = await this.placesProvider.getDetails(googlePlaceId);
      const normalized = { ...details, city: normalizeCityName(details.city) ?? details.city };
      await this.store.cachePlaces([normalized]);
      const visitCounts = await this.store.getDestinationVisitCounts([googlePlaceId]);
      return { ...normalized, visitCount: visitCounts.get(googlePlaceId) ?? 0 };
    });
  }

  async getPlacePhoto(googlePlaceId: string, photoName: string, actor: SessionActor) {
    if (!PHOTO_NAME_PATTERN.test(photoName) || !photoName.includes(googlePlaceId)) {
      throw badRequest(SearchErrorCode.INVALID_FILTER, "Photo name is invalid", { name: "Must belong to this place" });
    }
    const cached = await this.store.getCachedPlace(googlePlaceId);
    const useCached =
      Boolean(cached?.photoUri) &&
      (cached?.photoName === photoName || photoName.endsWith("/photos/seed") || photoName.includes("/photos/seed"));
    if (useCached && cached?.photoUri) {
      return { photoUri: cached.photoUri, attributions: [] };
    }
    return runWithPlacesQuotaUser(actorUserId(actor), () => this.placesProvider.getPhotoMedia(photoName));
  }

  async listPlaceTrips(googlePlaceId: string, page: number, limit: number) {
    const result = await this.store.listPlaceTrips(googlePlaceId, page, limit);
    return apiPage(result.items, page, limit, result.total);
  }

  async listPlaceTemplates(googlePlaceId: string, page: number, limit: number) {
    const result = await this.store.listPlaceTemplates(googlePlaceId, page, limit);
    return apiPage(result.items, page, limit, result.total);
  }

  async getTemplate(id: string) {
    const template = await this.store.getTemplate(id);
    if (!template) {
      throw notFound(SearchErrorCode.TEMPLATE_UNAVAILABLE, "Template is not available");
    }
    return template;
  }

  async useTemplate(templateId: string, body: UseTemplateBody, actor: SessionActor, idempotencyKey: string | undefined) {
    if (actor.kind !== "user") {
      throw unauthorized();
    }
    if (!idempotencyKey?.trim()) {
      throw badRequest(SearchErrorCode.INVALID_PLAN_INPUT, "Idempotency-Key is required", {
        idempotencyKey: "Required",
      });
    }

    const requestHash = createHash("sha256").update(JSON.stringify({ templateId, body })).digest("hex");
    const existing = await this.store.findIdempotency(actor.user.id, USE_TEMPLATE_OPERATION, idempotencyKey);
    if (existing) {
      if (existing.requestHash !== requestHash) {
        throw conflict(SearchErrorCode.IDEMPOTENCY_CONFLICT, "Idempotency key was reused with a different body");
      }
      return existing.responseBody as UseTemplateResult;
    }

    const result = await this.store.useTemplate({
      ...body,
      templateId,
      userId: actor.user.id,
      userEmail: actor.user.email,
      userAuthReference: actor.user.authReference,
      userRole: actor.user.role,
      userStatus: actor.user.status,
      emailVerifiedAt: actor.user.emailVerifiedAt,
      username: actor.user.username,
      displayName: actor.user.displayName,
      domicile: actor.user.domicile,
    });

    // Origin/budget change: signal client to regenerate routes & budget from new origin.
    (result as UseTemplateResult & { needsRecalculate?: boolean }).needsRecalculate = Boolean(
      body.originLabel || body.budgetAmount,
    );

    await this.store.saveIdempotency(
      actor.user.id,
      USE_TEMPLATE_OPERATION,
      idempotencyKey,
      requestHash,
      201,
      result,
      new Date(Date.now() + 24 * 60 * 60 * 1000),
    );
    return result;
  }

  private async withVisitCounts(places: PlaceSummary[]): Promise<PlaceSummary[]> {
    const counts = await this.store.getDestinationVisitCounts(places.map((place) => place.googlePlaceId));
    return places.map((place) => ({ ...place, visitCount: counts.get(place.googlePlaceId) ?? 0 }));
  }

  private assertCity(city: string | undefined, requiredForError = false) {
    if (!city) return;
    if (!CITY_PATTERN.test(city) || city.length < 2) {
      throw badRequest(
        requiredForError ? SearchErrorCode.INVALID_CITY : SearchErrorCode.INVALID_FILTER,
        "City filter is invalid",
        { city: "Use a valid city name" },
      );
    }
  }
}

function actorUserId(actor: SessionActor) {
  return actor.kind === "user" ? actor.user.id : null;
}

function sortPlaces(
  places: PlaceSummary[],
  sort: PlaceSearchQuery["sort"],
  latitude?: number,
  longitude?: number,
) {
  if (sort === "nearest" && latitude !== undefined && longitude !== undefined) {
    const origin = { latitude, longitude };
    return [...places].sort((a, b) => {
      const distanceDelta = distanceKm(origin, a) - distanceKm(origin, b);
      if (Math.abs(distanceDelta) > 0.05) return distanceDelta;
      return destinationScore(b) - destinationScore(a);
    });
  }
  if (sort === "popular") {
    return [...places].sort((a, b) => {
      const visitDelta = (b.visitCount ?? 0) - (a.visitCount ?? 0);
      if (visitDelta !== 0) return visitDelta;
      const destDelta = destinationScore(b) - destinationScore(a);
      if (destDelta !== 0) return destDelta;
      return (b.rating ?? 0) - (a.rating ?? 0);
    });
  }
  return [...places].sort((a, b) => destinationScore(b) - destinationScore(a));
}
