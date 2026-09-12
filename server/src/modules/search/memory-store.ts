import { randomUUID } from "node:crypto";
import type {
  ItineraryTemplateDetail,
  ItineraryTemplateSummary,
  PlaceSummary,
  TemplateSearchQuery,
  TripSearchQuery,
  TripStatus,
  TripSummary,
  TripVisibility,
  UseTemplateResult,
} from "@dolan/shared";
import { SearchErrorCode } from "@dolan/shared";
import { notFound } from "../../lib/api-error.ts";
import { addUtcDays, slicePage, templatePopularityLabel, templateSourceLabel, uniqueById } from "./labels.ts";
import { sortTrips, tripSortOrigin } from "./trip-rank.ts";
import type { SearchStore, StoredIdempotency, UseTemplateCommand } from "./types.ts";

export const MEMORY_TEMPLATE_ID = "44444444-4444-4444-8444-444444444401";
export const MEMORY_PLACE_MALIOBORO: PlaceSummary = {
  googlePlaceId: "ChIJxYBx6Da5eY4R2lX2sQ0oYkA",
  name: "Malioboro",
  formattedAddress: "Jl. Malioboro, Yogyakarta",
  city: "Yogyakarta",
  latitude: -7.7928,
  longitude: 110.3658,
  rating: 4.6,
  userRatingCount: 12000,
  photoName: "places/ChIJxYBx6Da5eY4R2lX2sQ0oYkA/photos/demo",
  googleMapsUrl: "https://maps.google.com/?q=Malioboro",
  types: ["tourist_attraction", "point_of_interest"],
};

type MemoryPlace = PlaceSummary & { id: string };
type MemoryTrip = TripSummary & {
  hostUserId: string;
  visitingGooglePlaceIds: string[];
};
type MemoryStop = {
  sequence: number;
  activityType: string;
  customTitle: string | null;
  durationMinutes: number;
  notes: string | null;
  placeId: string | null;
};
type MemoryDay = { id: string; dayNumber: number; title: string | null; stops: MemoryStop[] };
type MemoryTemplate = {
  id: string;
  title: string;
  description: string | null;
  city: string;
  durationDays: number;
  source: "CURATED" | "USER_TRIP";
  publicationStatus: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  transportMode: string | null;
  usageCount: number;
  coverPlaceId: string | null;
  createdAt: string;
  days: MemoryDay[];
};

function cachedPlaceSummary(place: MemoryPlace): PlaceSummary {
  return {
    googlePlaceId: place.googlePlaceId,
    name: place.name,
    formattedAddress: place.formattedAddress,
    city: place.city,
    latitude: place.latitude,
    longitude: place.longitude,
    rating: place.rating,
    userRatingCount: place.userRatingCount,
    photoName: place.photoName,
    googleMapsUrl: place.googleMapsUrl,
    types: place.types ?? [],
  };
}

export class MemorySearchStore implements SearchStore {
  places = new Map<string, MemoryPlace>();
  trips: MemoryTrip[] = [];
  templates: MemoryTemplate[] = [];
  usages: Array<{ templateId: string; userId: string; createdTripId: string }> = [];
  idempotency = new Map<string, StoredIdempotency>();

  constructor() {
    this.seed();
  }

  seed() {
    const malioboro: MemoryPlace = { id: "place-malioboro", ...MEMORY_PLACE_MALIOBORO };
    const prambanan: MemoryPlace = {
      id: "place-prambanan",
      googlePlaceId: "ChIJf5UqGYeXeY4RwZVQ9n0s7oE",
      name: "Candi Prambanan",
      formattedAddress: "Prambanan, Yogyakarta",
      city: "Yogyakarta",
      latitude: -7.752,
      longitude: 110.4915,
      rating: 4.7,
      userRatingCount: 8000,
      photoName: null,
      googleMapsUrl: null,
      types: ["tourist_attraction"],
    };
    this.places.set(malioboro.googlePlaceId, malioboro);
    this.places.set(prambanan.googlePlaceId, prambanan);

    this.templates.push({
      id: MEMORY_TEMPLATE_ID,
      title: "Yogyakarta 2 Hari Ringkas",
      description: "Template kurasi Dolan untuk Yogyakarta.",
      city: "Yogyakarta",
      durationDays: 2,
      source: "CURATED",
      publicationStatus: "PUBLISHED",
      transportMode: "MIXED",
      usageCount: 0,
      coverPlaceId: malioboro.id,
      createdAt: "2026-09-01T00:00:00.000Z",
      days: [
        {
          id: "day-1",
          dayNumber: 1,
          title: "Kota dan Candi",
          stops: [
            {
              sequence: 1,
              activityType: "VISIT",
              customTitle: null,
              durationMinutes: 120,
              notes: "Jalan kaki di Malioboro.",
              placeId: malioboro.id,
            },
          ],
        },
      ],
    });

    this.trips.push({
      id: "public-trip-1",
      title: "Eksplor Malioboro",
      destinationCity: "Yogyakarta",
      visibility: "PUBLIC",
      status: "OPEN",
      startDate: "2026-10-01",
      endDate: "2026-10-03",
      participantCount: 3,
      pendingRequestCount: 1,
      coverPlace: cachedPlaceSummary(malioboro),
      publicMeetingPointLabel: "Malioboro",
      publicMeetingPointLatitude: -7.7928,
      publicMeetingPointLongitude: 110.3658,
      hostUserId: "host-1",
      visitingGooglePlaceIds: [malioboro.googlePlaceId],
    });
    this.trips.push({
      id: "private-trip-1",
      title: "Private Yogyakarta",
      destinationCity: "Yogyakarta",
      visibility: "PRIVATE",
      status: "DRAFT",
      startDate: "2026-10-01",
      endDate: "2026-10-03",
      participantCount: 8,
      pendingRequestCount: 9,
      coverPlace: cachedPlaceSummary(malioboro),
      publicMeetingPointLabel: null,
      publicMeetingPointLatitude: null,
      publicMeetingPointLongitude: null,
      hostUserId: "host-2",
      visitingGooglePlaceIds: [malioboro.googlePlaceId],
    });
  }

  async listKnownCities() {
    return [...new Set([...this.places.values()].map((place) => place.city).filter(Boolean))] as string[];
  }

  async getDestinationVisitCounts(googlePlaceIds: string[]) {
    const counts = new Map<string, number>();
    for (const googlePlaceId of googlePlaceIds) {
      const visitCount = this.trips.filter(
        (trip) =>
          trip.visibility === "PUBLIC" &&
          (trip.status === "OPEN" || trip.status === "ONGOING") &&
          trip.visitingGooglePlaceIds.includes(googlePlaceId),
      ).length;
      counts.set(googlePlaceId, visitCount);
    }
    return counts;
  }

  async cachePlaces(places: PlaceSummary[]) {
    for (const place of places) {
      const existing = this.places.get(place.googlePlaceId);
      this.places.set(place.googlePlaceId, {
        id: existing?.id ?? randomUUID(),
        ...place,
      });
    }
  }

  async getCachedPlace(googlePlaceId: string) {
    const place = this.places.get(googlePlaceId);
    return place ? cachedPlaceSummary(place) : null;
  }

  async searchPublicTrips(query: TripSearchQuery) {
    let items = this.publicTrips().filter((trip) => {
      if (query.city && trip.destinationCity?.toLowerCase() !== query.city.toLowerCase()) return false;
      if (query.q && !trip.title.toLowerCase().includes(query.q.toLowerCase())) return false;
      if (query.dateFrom && trip.startDate && trip.startDate < query.dateFrom) return false;
      if (query.dateTo && trip.endDate && trip.endDate > query.dateTo) return false;
      return true;
    });
    items = sortTrips(items, query.sort, tripSortOrigin(query));
    return slicePage(items, query.page, query.limit);
  }

  async searchTemplates(query: TemplateSearchQuery) {
    let items = this.templates
      .filter((template) => template.publicationStatus === "PUBLISHED")
      .filter((template) => !query.city || template.city.toLowerCase() === query.city.toLowerCase())
      .map((template) => this.toSummary(template));
    items = sortTemplates(items, query.sort);
    return slicePage(items, query.page, query.limit);
  }

  async getTemplate(id: string) {
    const template = this.templates.find((item) => item.id === id && item.publicationStatus === "PUBLISHED");
    if (!template) return null;
    return {
      ...this.toSummary(template),
      description: template.description,
      transportMode: template.transportMode,
      days: template.days.map((day) => ({
        id: day.id,
        dayNumber: day.dayNumber,
        title: day.title,
        stops: day.stops.map((stop) => ({
          sequence: stop.sequence,
          activityType: stop.activityType,
          customTitle: stop.customTitle,
          durationMinutes: stop.durationMinutes,
          notes: stop.notes,
          place: this.placeById(stop.placeId),
        })),
      })),
    } satisfies ItineraryTemplateDetail;
  }

  async listPlaceTrips(googlePlaceId: string, page: number, limit: number) {
    const items = this.trips
      .filter(
        (trip) =>
          trip.visibility === "PUBLIC" &&
          trip.status !== "DRAFT" &&
          trip.status !== "CANCELLED" &&
          trip.visitingGooglePlaceIds.includes(googlePlaceId),
      )
      .map(toTripSummary);
    return slicePage(sortTrips(uniqueById(items), "popular"), page, limit);
  }

  async listPlaceTemplates(googlePlaceId: string, page: number, limit: number) {
    const place = this.places.get(googlePlaceId);
    const items = this.templates
      .filter((template) => template.publicationStatus === "PUBLISHED")
      .filter((template) => template.days.some((day) => day.stops.some((stop) => stop.placeId === place?.id)))
      .map((template) => this.toSummary(template));
    return slicePage(sortTemplates(uniqueById(items), "popular"), page, limit);
  }

  async useTemplate(command: UseTemplateCommand): Promise<UseTemplateResult> {
    const template = this.templates.find((item) => item.id === command.templateId);
    if (!template || template.publicationStatus !== "PUBLISHED") {
      throw notFound(SearchErrorCode.TEMPLATE_UNAVAILABLE, "Template is not available");
    }

    const endDate = command.endDate ?? addUtcDays(command.startDate, template.durationDays - 1);
    const cover = this.placeById(template.coverPlaceId);
    const tripId = randomUUID();
    const itineraryVersionId = randomUUID();
    const visitingGooglePlaceIds = template.days
      .flatMap((day) => day.stops)
      .map((stop) => this.placeByInternalId(stop.placeId)?.googlePlaceId)
      .filter((id): id is string => Boolean(id));

    const trip: MemoryTrip = {
      id: tripId,
      title: template.title,
      destinationCity: template.city,
      visibility: "PRIVATE",
      status: "DRAFT",
      startDate: command.startDate,
      endDate,
      participantCount: 0,
      pendingRequestCount: 0,
      coverPlace: cover,
      publicMeetingPointLabel: null,
      publicMeetingPointLatitude: null,
      publicMeetingPointLongitude: null,
      hostUserId: command.userId,
      visitingGooglePlaceIds,
    };
    this.trips.push(trip);
    template.usageCount += 1;
    this.usages.push({ templateId: template.id, userId: command.userId, createdTripId: tripId });

    return {
      tripId,
      itineraryVersionId,
      trip: toTripSummary(trip),
    };
  }

  async findIdempotency(actorUserId: string, operation: string, key: string) {
    return this.idempotency.get(`${actorUserId}:${operation}:${key}`) ?? null;
  }

  async saveIdempotency(
    actorUserId: string,
    operation: string,
    key: string,
    requestHash: string,
    responseStatus: number,
    responseBody: unknown,
    _expiresAt: Date,
  ) {
    this.idempotency.set(`${actorUserId}:${operation}:${key}`, {
      requestHash,
      responseStatus,
      responseBody,
    });
  }

  private publicTrips() {
    return this.trips
      .filter((trip) => trip.visibility === "PUBLIC" && trip.status !== "DRAFT" && trip.status !== "CANCELLED")
      .map(toTripSummary);
  }

  private toSummary(template: MemoryTemplate): ItineraryTemplateSummary {
    return {
      id: template.id,
      title: template.title,
      city: template.city,
      durationDays: template.durationDays,
      source: template.source,
      sourceLabel: templateSourceLabel(template.source),
      usageCount: template.usageCount,
      popularityLabel: templatePopularityLabel(template.usageCount),
      coverPlace: this.placeById(template.coverPlaceId),
    };
  }

  private placeById(placeId: string | null) {
    if (!placeId) return null;
    const place = [...this.places.values()].find((item) => item.id === placeId);
    return place ? cachedPlaceSummary(place) : null;
  }

  private placeByInternalId(placeId: string | null) {
    if (!placeId) return null;
    return [...this.places.values()].find((item) => item.id === placeId) ?? null;
  }
}

function toTripSummary(trip: MemoryTrip): TripSummary {
  return {
    id: trip.id,
    title: trip.title,
    destinationCity: trip.destinationCity,
    visibility: trip.visibility as TripVisibility,
    status: trip.status as TripStatus,
    startDate: trip.startDate,
    endDate: trip.endDate,
    participantCount: trip.participantCount,
    pendingRequestCount: trip.pendingRequestCount,
    coverPlace: trip.coverPlace,
    publicMeetingPointLabel: trip.publicMeetingPointLabel,
    publicMeetingPointLatitude: trip.publicMeetingPointLatitude,
    publicMeetingPointLongitude: trip.publicMeetingPointLongitude,
  };
}

function sortTemplates(items: ItineraryTemplateSummary[], sort: "recent" | "popular") {
  return [...items].sort((a, b) => {
    if (sort === "popular") return b.usageCount - a.usageCount;
    return a.title.localeCompare(b.title);
  });
}
