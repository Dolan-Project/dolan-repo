import { getModels, getSequelize } from "@dolan/database";
import {
  checklistMutationSchema,
  saveItineraryVersionSchema,
  selectItineraryVersionSchema,
  type BudgetItemInput,
  type EditableItineraryDay,
  type EditableItineraryStop,
  type EditableItineraryVersion,
  type ItineraryEditorSnapshot,
  type PlaceSummary,
} from "@dolan/shared";
import { env } from "../../config/env.ts";
import { badRequest, forbidden, notFound } from "../../lib/api-error.ts";
import { buildBudgetSummary } from "../jobs/budget.ts";
import { GoogleRoutesClient } from "../jobs/routes-adapter.ts";

function toPlaceSummary(place: {
  googlePlaceId: string;
  cachedName?: string | null;
  cachedCity?: string | null;
  cachedLatitude?: number | null;
  cachedLongitude?: number | null;
} | null): PlaceSummary | null {
  if (!place) return null;
  const latitude = place.cachedLatitude ?? 0;
  const longitude = place.cachedLongitude ?? 0;
  const name = place.cachedName ?? "Destinasi";
  return {
    googlePlaceId: place.googlePlaceId,
    name,
    formattedAddress: place.cachedCity ? `${name}, ${place.cachedCity}` : name,
    city: place.cachedCity ?? null,
    latitude,
    longitude,
    rating: null,
    userRatingCount: null,
    photoName: null,
    googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`,
  };
}

async function requireTripAccess(tripId: string, actorId: string | null, asHost: boolean) {
  const { Trip, TripMember } = getModels();
  const trip = await Trip.findByPk(tripId);
  if (!trip) throw notFound("TRIP_NOT_FOUND", "Trip tidak ditemukan");
  if (asHost) {
    if (!actorId || trip.hostUserId !== actorId) throw forbidden("NOT_HOST", "Hanya host yang dapat mengubah itinerary");
    return trip;
  }
  if (trip.visibility === "PUBLIC" && trip.status !== "DRAFT") return trip;
  if (!actorId) throw notFound("TRIP_NOT_FOUND", "Trip tidak ditemukan");
  if (trip.hostUserId === actorId) return trip;
  const member = await TripMember.findOne({ where: { tripId, userId: actorId, membershipStatus: "ACTIVE" } });
  if (!member) throw notFound("TRIP_NOT_FOUND", "Trip tidak ditemukan");
  return trip;
}

async function mapVersion(version: {
  id: string;
  tripId: string;
  versionNumber: number;
  source: "MANUAL" | "AI" | "TEMPLATE" | "REGENERATED";
  summary: string | null;
  assumptions: unknown;
  createdAt: Date;
}): Promise<EditableItineraryVersion> {
  const { ItineraryDay, ItineraryStop, Place, BudgetItem } = getModels();
  const days = await ItineraryDay.findAll({ where: { itineraryVersionId: version.id }, order: [["dayNumber", "ASC"]] });
  const mappedDays: EditableItineraryDay[] = [];
  for (const day of days) {
    const stops = await ItineraryStop.findAll({ where: { itineraryDayId: day.id }, order: [["sequence", "ASC"]] });
    const mappedStops: EditableItineraryStop[] = [];
    for (const stop of stops) {
      const place = stop.placeId ? await Place.findByPk(stop.placeId) : null;
      mappedStops.push({
        id: stop.id,
        sequence: stop.sequence,
        place: toPlaceSummary(place),
        customTitle: stop.customTitle,
        activityType: stop.activityType,
        startTime: stop.startTime,
        durationMinutes: stop.durationMinutes,
        travelDurationMinutes: stop.travelDurationMinutes,
        routePolyline: stop.routePolyline,
        travelDistanceMeters: stop.travelDistanceMeters,
        routeStatus: stop.routeStatus,
        routeTravelMode: stop.routeTravelMode,
        notes: stop.notes,
        isLocked: stop.isLocked,
      });
    }
    mappedDays.push({
      id: day.id,
      dayNumber: day.dayNumber,
      date: day.date ?? "",
      title: day.title,
      stops: mappedStops,
    });
  }
  const budgetRows = await BudgetItem.findAll({ where: { itineraryVersionId: version.id } });
  const budget = buildBudgetSummary(
    budgetRows.map((item) => ({
      category: item.category as BudgetItemInput["category"],
      label: item.label,
      quantity: item.quantity,
      unit: item.unit,
      unitCostLow: item.unitCostLow,
      unitCostHigh: item.unitCostHigh,
      sourceType: item.sourceType,
      sourceReference: item.sourceReference,
      notes: item.notes,
    })),
  );
  return {
    id: version.id,
    tripId: version.tripId,
    versionNumber: version.versionNumber,
    source: version.source,
    summary: version.summary,
    assumptions: Array.isArray(version.assumptions) ? version.assumptions.map(String) : [],
    days: mappedDays,
    budget,
    createdAt: version.createdAt.toISOString(),
  };
}

export async function getItinerarySnapshot(tripId: string, actorId: string | null): Promise<ItineraryEditorSnapshot> {
  const trip = await requireTripAccess(tripId, actorId, false);
  const { ItineraryVersion, TripChecklistItem } = getModels();
  const versions = await ItineraryVersion.findAll({ where: { tripId }, order: [["versionNumber", "DESC"]] });
  const mapped = await Promise.all(versions.map((version) => mapVersion(version.toJSON())));
  const checklist = await TripChecklistItem.findAll({ where: { tripId }, order: [["createdAt", "ASC"]] });
  return {
    tripId: trip.id,
    tripTitle: trip.title,
    destinationCity: trip.destinationCity ?? "Tujuan belum ditentukan",
    startDate: trip.startDate ?? "",
    endDate: trip.endDate ?? trip.startDate ?? "",
    activeVersionId: trip.currentItineraryVersionId ?? mapped[0]?.id ?? "",
    versions: mapped,
    checklist: checklist.map((item) => ({
      id: item.id,
      title: item.title,
      dueDate: item.dueDate,
      isCompleted: item.isCompleted,
    })),
  };
}

async function applyRoadRoutes(days: EditableItineraryDay[]) {
  if (!env.googleMapsServerKey) return days;
  const client = new GoogleRoutesClient(env.googleMapsServerKey);
  const next = structuredClone(days);
  for (const day of next) {
    for (let index = 1; index < day.stops.length; index += 1) {
      const from = day.stops[index - 1]?.place;
      const to = day.stops[index]?.place;
      if (!from || !to || (from.latitude === 0 && from.longitude === 0) || (to.latitude === 0 && to.longitude === 0)) continue;
      const leg = await client.computeLeg(
        { latitude: from.latitude, longitude: from.longitude },
        { latitude: to.latitude, longitude: to.longitude },
      );
      if (!leg.ok) {
        day.stops[index]!.routeStatus = "UNAVAILABLE";
        continue;
      }
      day.stops[index]!.travelDurationMinutes = leg.durationMinutes;
      day.stops[index]!.routePolyline = leg.encodedPolyline ?? null;
      day.stops[index]!.travelDistanceMeters = leg.distanceMeters ?? null;
      day.stops[index]!.routeStatus = leg.encodedPolyline ? "AVAILABLE" : "PENDING";
      day.stops[index]!.routeTravelMode = leg.travelMode ?? "DRIVE";
    }
  }
  return next;
}

export async function saveItineraryVersion(tripId: string, actorId: string, body: unknown) {
  const trip = await requireTripAccess(tripId, actorId, true);
  const parsed = saveItineraryVersionSchema.parse(body);
  const sequelize = getSequelize();
  const { ItineraryVersion, ItineraryDay, ItineraryStop, Place, BudgetItem, Trip } = getModels();
  const daysWithPlaces: EditableItineraryDay[] = [];
  for (const day of parsed.days) {
    const stops: EditableItineraryStop[] = [];
    for (const stop of day.stops) {
      const stored = stop.googlePlaceId ? await Place.findOne({ where: { googlePlaceId: stop.googlePlaceId } }) : null;
      stops.push({
        ...stop,
        place: toPlaceSummary(stored) ?? (stop.googlePlaceId
          ? {
              googlePlaceId: stop.googlePlaceId,
              name: stop.customTitle ?? "Destinasi",
              formattedAddress: null,
              city: null,
              latitude: 0,
              longitude: 0,
              rating: null,
              userRatingCount: null,
              photoName: null,
              googleMapsUrl: null,
            }
          : null),
        routePolyline: null,
        travelDistanceMeters: null,
        routeStatus: "PENDING",
        routeTravelMode: null,
      });
    }
    daysWithPlaces.push({ ...day, stops });
  }
  const routedDays = await applyRoadRoutes(daysWithPlaces);

  await sequelize.transaction(async (transaction) => {
    const maxVersion = Number((await ItineraryVersion.max("versionNumber", { where: { tripId }, transaction })) ?? 0);
    const version = await ItineraryVersion.create(
      {
        tripId,
        versionNumber: maxVersion + 1,
        createdByUserId: actorId,
        source: "MANUAL",
        summary: parsed.summary,
        assumptions: ["Disimpan dari editor itinerary"] as unknown as never,
      },
      { transaction },
    );
    const budget = buildBudgetSummary(parsed.budgetItems, trip.budgetBasis ?? "PER_PERSON");
    for (const day of routedDays) {
      const persistedDay = await ItineraryDay.create(
        {
          itineraryVersionId: version.id,
          dayNumber: day.dayNumber,
          date: day.date,
          title: day.title,
        },
        { transaction },
      );
      for (const stop of day.stops) {
        let placeId: string | null = null;
        if (stop.place?.googlePlaceId) {
          const [place] = await Place.findOrCreate({
            where: { googlePlaceId: stop.place.googlePlaceId },
            defaults: {
              googlePlaceId: stop.place.googlePlaceId,
              cachedName: stop.place.name,
              cachedCity: stop.place.city,
              cachedLatitude: stop.place.latitude || null,
              cachedLongitude: stop.place.longitude || null,
              status: "ACTIVE",
            },
            transaction,
          });
          placeId = place.id;
        }
        await ItineraryStop.create(
          {
            itineraryDayId: persistedDay.id,
            placeId,
            sequence: stop.sequence,
            activityType: stop.activityType,
            customTitle: stop.customTitle,
            startTime: stop.startTime,
            durationMinutes: stop.durationMinutes,
            travelDurationMinutes: stop.travelDurationMinutes,
            routePolyline: stop.routePolyline ?? null,
            travelDistanceMeters: stop.travelDistanceMeters ?? null,
            routeStatus: stop.routeStatus ?? "PENDING",
            routeTravelMode: stop.routeTravelMode ?? null,
            notes: stop.notes,
            isLocked: stop.isLocked,
          },
          { transaction },
        );
      }
    }
    for (const item of budget.items) {
      await BudgetItem.create(
        {
          itineraryVersionId: version.id,
          category: item.category,
          label: item.label,
          quantity: item.quantity,
          unit: item.unit,
          unitCostLow: item.unitCostLow,
          unitCostHigh: item.unitCostHigh,
          sourceType: item.sourceType,
          sourceReference: item.sourceReference,
          notes: item.notes,
        },
        { transaction },
      );
    }
    await Trip.update({ currentItineraryVersionId: version.id }, { where: { id: tripId }, transaction });
    return version.id;
  });
  return getItinerarySnapshot(tripId, actorId);
}

export async function selectItineraryVersion(tripId: string, actorId: string, body: unknown) {
  await requireTripAccess(tripId, actorId, true);
  const parsed = selectItineraryVersionSchema.parse(body);
  const { ItineraryVersion, Trip } = getModels();
  const version = await ItineraryVersion.findOne({ where: { id: parsed.versionId, tripId } });
  if (!version) throw badRequest("INVALID_PLAN_INPUT", "Versi itinerary tidak ditemukan pada trip ini");
  await Trip.update({ currentItineraryVersionId: version.id }, { where: { id: tripId } });
  return getItinerarySnapshot(tripId, actorId);
}

export async function upsertChecklist(tripId: string, actorId: string, body: unknown) {
  await requireTripAccess(tripId, actorId, true);
  const parsed = checklistMutationSchema.parse(body);
  const { TripChecklistItem } = getModels();
  if (parsed.id) {
    const item = await TripChecklistItem.findOne({ where: { id: parsed.id, tripId } });
    if (!item) throw notFound("NOT_FOUND", "Checklist tidak ditemukan");
    await item.update({
      title: parsed.title,
      dueDate: parsed.dueDate,
      isCompleted: parsed.isCompleted,
      completedAt: parsed.isCompleted ? new Date() : null,
    });
    return item;
  }
  return TripChecklistItem.create({
    tripId,
    userId: actorId,
    title: parsed.title,
    dueDate: parsed.dueDate,
    isCompleted: parsed.isCompleted,
    completedAt: parsed.isCompleted ? new Date() : null,
  });
}

export async function deleteChecklist(tripId: string, actorId: string, itemId: string) {
  await requireTripAccess(tripId, actorId, true);
  const { TripChecklistItem } = getModels();
  const item = await TripChecklistItem.findOne({ where: { id: itemId, tripId } });
  if (!item) throw notFound("NOT_FOUND", "Checklist tidak ditemukan");
  await item.destroy();
  return { deleted: true as const };
}
