import { Op, QueryTypes } from "sequelize";
import {
  getSequelize,
  IdempotencyKey,
  ItineraryDay,
  ItineraryStop,
  ItineraryTemplate,
  ItineraryVersion,
  Place,
  TemplateDay,
  TemplateStop,
  TemplateUsage,
  Trip,
  TripJoinRequest,
  TripMember,
  User,
} from "@dolan/database";
import type {
  ItineraryTemplateDetail,
  ItineraryTemplateSummary,
  PlaceSummary,
  TemplateSearchQuery,
  TripSearchQuery,
  TripSummary,
  UseTemplateResult,
} from "@dolan/shared";
import { SearchErrorCode } from "@dolan/shared";
import { notFound } from "../../lib/api-error.ts";
import { addUtcDays, slicePage, templatePopularityLabel, templateSourceLabel } from "./labels.ts";
import { normalizeCityName } from "./city-catalog.ts";
import type { SearchStore, StoredIdempotency, UseTemplateCommand } from "./types.ts";

export class SequelizeSearchStore implements SearchStore {
  async listKnownCities() {
    const places = await Place.findAll({
      attributes: ["cachedCity"],
      where: { cachedCity: { [Op.ne]: null }, status: "ACTIVE" },
    });
    const templates = await ItineraryTemplate.findAll({
      attributes: ["city"],
      where: { publicationStatus: "PUBLISHED" },
    });
    return [
      ...new Set(
        [...places.map((place) => place.cachedCity), ...templates.map((template) => template.city)].filter(
          (city): city is string => Boolean(city),
        ),
      ),
    ];
  }

  async getDestinationVisitCounts(googlePlaceIds: string[]) {
    const counts = new Map<string, number>(googlePlaceIds.map((id) => [id, 0]));
    if (googlePlaceIds.length === 0) return counts;

    const rows = await getSequelize().query<{ google_place_id: string; visit_count: string }>(
      `
        SELECT p.google_place_id, COUNT(DISTINCT t.id)::int AS visit_count
        FROM places p
        JOIN itinerary_stops s ON s.place_id = p.id
        JOIN itinerary_days d ON d.id = s.itinerary_day_id
        JOIN itinerary_versions v ON v.id = d.itinerary_version_id
        JOIN trips t ON t.current_itinerary_version_id = v.id
        WHERE t.visibility = 'PUBLIC'
          AND t.status IN ('OPEN', 'ONGOING')
          AND p.google_place_id IN (:googlePlaceIds)
        GROUP BY p.google_place_id
      `,
      {
        replacements: { googlePlaceIds },
        type: QueryTypes.SELECT,
      },
    );

    for (const row of rows) {
      counts.set(row.google_place_id, Number(row.visit_count));
    }
    return counts;
  }

  async cachePlaces(places: PlaceSummary[]) {
    for (const place of places) {
      const [row] = await Place.findOrCreate({
        where: { googlePlaceId: place.googlePlaceId },
        defaults: {
          googlePlaceId: place.googlePlaceId,
          cachedName: place.name,
          cachedCity: place.city,
          cachedLatitude: place.latitude,
          cachedLongitude: place.longitude,
          cacheCheckedAt: new Date(),
          status: "ACTIVE",
        },
      });
      await row.update({
        cachedName: place.name,
        cachedCity: place.city,
        cachedLatitude: place.latitude,
        cachedLongitude: place.longitude,
        cacheCheckedAt: new Date(),
        status: "ACTIVE",
      });
    }
  }

  async getCachedPlace(googlePlaceId: string) {
    const place = await Place.findOne({ where: { googlePlaceId, status: "ACTIVE" } });
    return place ? fromCachedPlace(place) : null;
  }

  async searchPublicTrips(query: TripSearchQuery) {
    const items = await loadPublicTripSummaries({
      city: query.city,
      q: query.q,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
    });
    const sorted = sortTrips(items, query.sort);
    return slicePage(sorted, query.page, query.limit);
  }

  async searchTemplates(query: TemplateSearchQuery) {
    const where: Record<string, unknown> = { publicationStatus: "PUBLISHED" };
    if (query.city) where.city = { [Op.iLike]: query.city };
    const templates = await ItineraryTemplate.findAll({
      where,
      include: [{ model: Place, as: "coverPlace" }],
      order: query.sort === "popular" ? [["usageCount", "DESC"], ["createdAt", "DESC"]] : [["createdAt", "DESC"]],
    });
    const items = templates.map(toTemplateSummary);
    return slicePage(items, query.page, query.limit);
  }

  async getTemplate(id: string) {
    const template = await ItineraryTemplate.findOne({
      where: { id, publicationStatus: "PUBLISHED" },
      include: [
        { model: Place, as: "coverPlace" },
        {
          model: TemplateDay,
          as: "days",
          include: [{ model: TemplateStop, as: "stops", include: [{ model: Place, as: "place" }] }],
        },
      ],
      order: [
        [{ model: TemplateDay, as: "days" }, "dayNumber", "ASC"],
        [{ model: TemplateDay, as: "days" }, { model: TemplateStop, as: "stops" }, "sequence", "ASC"],
      ],
    });
    if (!template) return null;
    const days = ((template as unknown as { days?: TemplateDay[] }).days ?? []).map((day) => ({
      id: day.id,
      dayNumber: day.dayNumber,
      title: day.title,
      stops: ((day as unknown as { stops?: TemplateStop[] }).stops ?? []).map((stop) => ({
        sequence: stop.sequence,
        activityType: stop.activityType,
        customTitle: stop.customTitle,
        durationMinutes: stop.durationMinutes,
        notes: stop.notes,
        place: fromCachedPlace((stop as unknown as { place?: Place | null }).place ?? null),
      })),
    }));
    return {
      ...toTemplateSummary(template),
      description: template.description,
      transportMode: template.transportMode,
      days,
    } satisfies ItineraryTemplateDetail;
  }

  async listPlaceTrips(googlePlaceId: string, page: number, limit: number) {
    const withVisit = await tripsVisiting(googlePlaceId);
    return slicePage(sortTrips(withVisit, "popular"), page, limit);
  }

  async listPlaceTemplates(googlePlaceId: string, page: number, limit: number) {
    const place = await Place.findOne({ where: { googlePlaceId } });
    if (!place) return { items: [], total: 0 };
    const templates = await ItineraryTemplate.findAll({
      where: { publicationStatus: "PUBLISHED" },
      include: [
        { model: Place, as: "coverPlace" },
        {
          model: TemplateDay,
          as: "days",
          required: true,
          include: [{ model: TemplateStop, as: "stops", required: true, where: { placeId: place.id } }],
        },
      ],
    });
    return slicePage(templates.map(toTemplateSummary), page, limit);
  }

  async useTemplate(command: UseTemplateCommand): Promise<UseTemplateResult> {
    const sequelize = getSequelize();
    return sequelize.transaction(async (transaction) => {
      const template = await ItineraryTemplate.findOne({
        where: { id: command.templateId, publicationStatus: "PUBLISHED" },
        include: [
          { model: Place, as: "coverPlace" },
          {
            model: TemplateDay,
            as: "days",
            include: [{ model: TemplateStop, as: "stops", include: [{ model: Place, as: "place" }] }],
          },
        ],
        transaction,
      });
      if (!template) {
        throw notFound(SearchErrorCode.TEMPLATE_UNAVAILABLE, "Template is not available");
      }

      await User.findOrCreate({
        where: { id: command.userId },
        defaults: {
          id: command.userId,
          authReference: command.userAuthReference,
          email: command.userEmail,
          role: command.userRole,
          status: command.userStatus,
          emailVerifiedAt: command.emailVerifiedAt ? new Date(command.emailVerifiedAt) : null,
        },
        transaction,
      });

      const endDate = command.endDate ?? addUtcDays(command.startDate, template.durationDays - 1);
      const trip = await Trip.create(
        {
          hostUserId: command.userId,
          title: template.title,
          description: template.description,
          visibility: "PRIVATE",
          status: "DRAFT",
          startDate: command.startDate,
          endDate,
          destinationCity: template.city,
          privateOriginLabel: command.originLabel ?? null,
          transportMode: command.transportMode ?? template.transportMode,
          planningPartySize: command.planningPartySize,
          budgetAmount: command.budgetAmount ?? null,
          budgetBasis: command.budgetBasis ?? "PER_PERSON",
        },
        { transaction },
      );

      const version = await ItineraryVersion.create(
        {
          tripId: trip.id,
          versionNumber: 1,
          createdByUserId: command.userId,
          source: "TEMPLATE",
          summary: template.description,
        },
        { transaction },
      );

      const days = ((template as unknown as { days?: TemplateDay[] }).days ?? []).slice().sort((a, b) => a.dayNumber - b.dayNumber);
      for (const templateDay of days) {
        const day = await ItineraryDay.create(
          {
            itineraryVersionId: version.id,
            dayNumber: templateDay.dayNumber,
            date: addUtcDays(command.startDate, templateDay.dayNumber - 1),
            title: templateDay.title,
          },
          { transaction },
        );
        const stops = ((templateDay as unknown as { stops?: TemplateStop[] }).stops ?? []).slice().sort((a, b) => a.sequence - b.sequence);
        for (const stop of stops) {
          await ItineraryStop.create(
            {
              itineraryDayId: day.id,
              placeId: stop.placeId,
              sequence: stop.sequence,
              activityType: stop.activityType,
              customTitle: stop.customTitle,
              durationMinutes: stop.durationMinutes,
              notes: stop.notes,
              isLocked: false,
            },
            { transaction },
          );
        }
      }

      await trip.update({ currentItineraryVersionId: version.id }, { transaction });
      await TripMember.create(
        {
          tripId: trip.id,
          userId: command.userId,
          role: "HOST",
          membershipStatus: "ACTIVE",
          joinedAt: new Date(),
        },
        { transaction },
      );
      await TemplateUsage.create(
        {
          templateId: template.id,
          userId: command.userId,
          createdTripId: trip.id,
          usedAt: new Date(),
        },
        { transaction },
      );
      await template.increment("usageCount", { transaction });
      await template.reload({ transaction, include: [{ model: Place, as: "coverPlace" }] });

      const coverPlace = fromCachedPlace((template as unknown as { coverPlace?: Place | null }).coverPlace ?? null);
      const tripSummary: TripSummary = {
        id: trip.id,
        title: trip.title,
        destinationCity: trip.destinationCity,
        visibility: trip.visibility,
        status: trip.status,
        startDate: trip.startDate,
        endDate: trip.endDate,
        participantCount: 0,
        pendingRequestCount: 0,
        coverPlace,
      };

      return {
        tripId: trip.id,
        itineraryVersionId: version.id,
        trip: tripSummary,
      };
    });
  }

  async findIdempotency(actorUserId: string, operation: string, key: string): Promise<StoredIdempotency | null> {
    const row = await IdempotencyKey.findOne({ where: { actorUserId, operation, key } });
    if (!row || row.expiresAt.getTime() < Date.now() || row.responseStatus == null) return null;
    return {
      requestHash: row.requestHash,
      responseStatus: row.responseStatus,
      responseBody: row.responseBody,
    };
  }

  async saveIdempotency(
    actorUserId: string,
    operation: string,
    key: string,
    requestHash: string,
    responseStatus: number,
    responseBody: unknown,
    expiresAt: Date,
  ) {
    await IdempotencyKey.create({
      actorUserId,
      operation,
      key,
      requestHash,
      responseStatus,
      responseBody: responseBody as object,
      expiresAt,
    });
  }
}

function fromCachedPlace(place: Place | null): PlaceSummary | null {
  if (!place) return null;
  return {
    googlePlaceId: place.googlePlaceId,
    name: place.cachedName ?? "Unknown place",
    formattedAddress: null,
    city: normalizeCityName(place.cachedCity),
    latitude: place.cachedLatitude ?? 0,
    longitude: place.cachedLongitude ?? 0,
    rating: null,
    userRatingCount: null,
    photoName: null,
    googleMapsUrl: null,
    types: [],
  };
}

function toTemplateSummary(template: ItineraryTemplate): ItineraryTemplateSummary {
  return {
    id: template.id,
    title: template.title,
    city: template.city,
    durationDays: template.durationDays,
    source: template.source,
    sourceLabel: templateSourceLabel(template.source),
    usageCount: template.usageCount,
    popularityLabel: templatePopularityLabel(template.usageCount),
    coverPlace: fromCachedPlace((template as unknown as { coverPlace?: Place | null }).coverPlace ?? null),
  };
}

function toTripSummary(trip: Trip): TripSummary {
  const members = ((trip as unknown as { members?: TripMember[] }).members ?? []).filter(
    (member) => member.role === "PARTICIPANT" && member.membershipStatus === "ACTIVE",
  );
  const pending = ((trip as unknown as { joinRequests?: TripJoinRequest[] }).joinRequests ?? []).filter(
    (request) => request.status === "PENDING",
  );
  const coverStop = ((trip as unknown as { currentItineraryVersion?: ItineraryVersion & { days?: Array<ItineraryDay & { stops?: Array<ItineraryStop & { place?: Place | null }> }> } }).currentItineraryVersion?.days ?? [])
    .flatMap((day) => day.stops ?? [])
    .find((stop) => stop.place);
  return {
    id: trip.id,
    title: trip.title,
    destinationCity: trip.destinationCity,
    visibility: trip.visibility,
    status: trip.status,
    startDate: trip.startDate,
    endDate: trip.endDate,
    participantCount: members.length,
    pendingRequestCount: pending.length,
    coverPlace: fromCachedPlace(coverStop?.place ?? null),
  };
}

async function loadPublicTripSummaries(filter: { city?: string; q?: string; dateFrom?: string; dateTo?: string }) {
  const where: Record<string, unknown> = {
    visibility: "PUBLIC",
    status: { [Op.notIn]: ["DRAFT", "CANCELLED"] },
  };
  if (filter.city) where.destinationCity = { [Op.iLike]: filter.city };
  if (filter.q) where.title = { [Op.iLike]: `%${filter.q}%` };
  if (filter.dateFrom) where.startDate = { [Op.gte]: filter.dateFrom };
  if (filter.dateTo) where.endDate = { [Op.lte]: filter.dateTo };

  const trips = await Trip.findAll({
    where,
    include: [
      { model: TripMember, as: "members" },
      { model: TripJoinRequest, as: "joinRequests" },
      {
        model: ItineraryVersion,
        as: "currentItineraryVersion",
        include: [
          {
            model: ItineraryDay,
            as: "days",
            include: [{ model: ItineraryStop, as: "stops", include: [{ model: Place, as: "place" }] }],
          },
        ],
      },
    ],
  });
  return trips.map(toTripSummary);
}

async function tripsVisiting(googlePlaceId: string) {
  const trips = await Trip.findAll({
    where: {
      visibility: "PUBLIC",
      status: { [Op.in]: ["OPEN", "ONGOING", "CLOSED", "COMPLETED"] },
    },
    include: [
      { model: TripMember, as: "members" },
      { model: TripJoinRequest, as: "joinRequests" },
      {
        model: ItineraryVersion,
        as: "currentItineraryVersion",
        required: true,
        include: [
          {
            model: ItineraryDay,
            as: "days",
            required: true,
            include: [
              {
                model: ItineraryStop,
                as: "stops",
                required: true,
                include: [{ model: Place, as: "place", required: true, where: { googlePlaceId } }],
              },
            ],
          },
        ],
      },
    ],
  });
  return trips.map(toTripSummary);
}

function sortTrips(items: TripSummary[], sort: "recent" | "popular") {
  return [...items].sort((a, b) => {
    if (sort === "popular") {
      if (b.participantCount !== a.participantCount) return b.participantCount - a.participantCount;
      return b.pendingRequestCount - a.pendingRequestCount;
    }
    return (b.startDate ?? "").localeCompare(a.startDate ?? "");
  });
}
