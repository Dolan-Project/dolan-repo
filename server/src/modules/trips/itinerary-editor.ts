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
import { badRequest, forbidden, notFound, unauthorized } from "../../lib/api-error.ts";
import { buildBudgetSummary } from "../jobs/budget.ts";
import { GoogleRoutesClient } from "../jobs/routes-adapter.ts";
import { ZodError } from "zod";

function toPlaceSummary(place: {
  googlePlaceId: string;
  cachedName?: string | null;
  cachedCity?: string | null;
  cachedLatitude?: number | null;
  cachedLongitude?: number | null;
    cachedPhotoName?: string | null;
    cachedPhotoUrl?: string | null;
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
    photoName: place.cachedPhotoName ?? null,
    photoUri: place.cachedPhotoUrl ?? null,
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

async function requireTripMember(tripId: string, actorId: string | null) {
  const { Trip, TripMember } = getModels();
  const trip = await Trip.findByPk(tripId);
  if (!trip) throw notFound("TRIP_NOT_FOUND", "Trip tidak ditemukan");
  if (!actorId) throw unauthorized();
  if (trip.hostUserId === actorId) return trip;
  const member = await TripMember.findOne({ where: { tripId, userId: actorId, membershipStatus: "ACTIVE" } });
  if (!member) throw forbidden("NOT_MEMBER", "Hanya host dan peserta yang dapat mengubah checklist");
  return trip;
}

function isoDayDate(value: string | Date | null | undefined, fallback: string) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  const text = String(value ?? "").slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : fallback;
}

function addDaysToIso(startDate: string, dayOffset: number) {
  const [year, month, day] = startDate.split("-").map(Number);
  const date = new Date(Date.UTC(year || 2026, (month || 1) - 1, (day || 1) + dayOffset));
  return date.toISOString().slice(0, 10);
}

export function fillMissingDayDates<T extends { dayNumber?: number; date?: string | null }>(
  days: T[],
  startDate: string | null | undefined,
): T[] {
  const base = isoDayDate(startDate, "");
  return days.map((day, index) => {
    const offset = Math.max(0, (day.dayNumber ?? index + 1) - 1);
    const fallback = base ? addDaysToIso(base, offset) : addDaysToIso(new Date().toISOString().slice(0, 10), offset);
    return { ...day, date: isoDayDate(day.date, fallback) };
  });
}

async function mapVersion(
  version: {
    id: string;
    tripId: string;
    versionNumber: number;
    source: "MANUAL" | "AI" | "TEMPLATE" | "REGENERATED";
    summary: string | null;
    assumptions: unknown;
    createdAt: Date;
  },
  startDate: string | null,
): Promise<EditableItineraryVersion> {
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
      date: isoDayDate(day.date, startDate ? addDaysToIso(startDate, Math.max(0, day.dayNumber - 1)) : ""),
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
  const { ItineraryVersion, TripChecklistItem, TripChecklistCheck } = getModels();
  const versions = await ItineraryVersion.findAll({ where: { tripId }, order: [["versionNumber", "DESC"]] });
  const mapped: EditableItineraryVersion[] = [];
  for (const version of versions) {
    try {
      mapped.push(await mapVersion(version.toJSON(), trip.startDate ?? ""));
    } catch {
      continue;
    }
  }
  const checklist = await TripChecklistItem.findAll({ where: { tripId }, order: [["createdAt", "ASC"]] });
  const checks = actorId && checklist.length
    ? await TripChecklistCheck.findAll({
        where: { userId: actorId, itemId: checklist.map((item) => item.id) },
      })
    : [];
  const completedIds = new Set(checks.map((row) => row.itemId));
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
      isCompleted: actorId ? completedIds.has(item.id) : false,
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
        day.stops[index]!.routePolyline = null;
        day.stops[index]!.travelDurationMinutes = null;
        day.stops[index]!.travelDistanceMeters = null;
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
  const raw = body && typeof body === "object" ? { ...(body as Record<string, unknown>) } : {};
  if (Array.isArray(raw.days)) {
    raw.days = fillMissingDayDates(raw.days as Array<{ dayNumber?: number; date?: string | null }>, trip.startDate);
  }
  let parsed;
  try {
    parsed = saveItineraryVersionSchema.parse(raw);
  } catch (error) {
    if (error instanceof ZodError) {
      const fields = Object.fromEntries(error.issues.map((issue) => [issue.path.join(".") || "body", issue.message]));
      const first = error.issues[0];
      throw badRequest(
        "VALIDATION_ERROR",
        first ? `Itinerary tidak valid: ${first.path.join(".") || "data"} ${first.message}` : "Itinerary tidak valid",
        fields,
      );
    }
    throw error;
  }
  const sequelize = getSequelize();
  const { ItineraryVersion, ItineraryDay, ItineraryStop, Place, BudgetItem, Trip } = getModels();
  const daysWithPlaces: EditableItineraryDay[] = [];
  for (const day of parsed.days) {
    const stops: EditableItineraryStop[] = [];
    for (const stop of day.stops) {
      const stored = stop.googlePlaceId ? await Place.findOne({ where: { googlePlaceId: stop.googlePlaceId } }) : null;
      const latitude = stop.latitude ?? stored?.cachedLatitude ?? 0;
      const longitude = stop.longitude ?? stored?.cachedLongitude ?? 0;
      const name = stop.customTitle ?? stored?.cachedName ?? "Destinasi";
      const googlePlaceId = stop.googlePlaceId ?? `tpl-${stop.id}`;
      stops.push({
        id: stop.id,
        sequence: stop.sequence,
        place: {
          googlePlaceId,
          name,
          formattedAddress: stored?.cachedCity ? `${name}, ${stored.cachedCity}` : name,
          city: stored?.cachedCity ?? trip.destinationCity ?? null,
          latitude,
          longitude,
          rating: null,
          userRatingCount: null,
          photoName: null,
          googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${name} ${latitude},${longitude}`)}`,
        },
        customTitle: stop.customTitle,
        activityType: stop.activityType,
        startTime: stop.startTime,
        durationMinutes: stop.durationMinutes,
        travelDurationMinutes: stop.travelDurationMinutes,
        notes: stop.notes,
        isLocked: stop.isLocked,
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
          if (stop.place.latitude || stop.place.longitude) {
            await place.update({
              cachedName: stop.place.name,
              cachedCity: stop.place.city ?? place.cachedCity,
              cachedLatitude: stop.place.latitude || place.cachedLatitude,
              cachedLongitude: stop.place.longitude || place.cachedLongitude,
            }, { transaction });
          }
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
  await requireTripMember(tripId, actorId);
  const parsed = checklistMutationSchema.parse(body);
  const { TripChecklistItem, TripChecklistCheck } = getModels();
  const items = await TripChecklistItem.findAll({ where: { tripId } });
  const needle = parsed.title.trim().toLowerCase();
  let item = parsed.id
    ? items.find((row) => row.id === parsed.id) ?? null
    : items.find((row) => row.title.trim().toLowerCase() === needle) ?? null;
  if (parsed.id && !item) throw notFound("NOT_FOUND", "Checklist tidak ditemukan");
  if (!item) {
    item = await TripChecklistItem.create({
      tripId,
      userId: actorId,
      title: parsed.title.trim(),
      dueDate: parsed.dueDate,
      isCompleted: false,
      completedAt: null,
    });
  } else if (item.title !== parsed.title.trim() || item.dueDate !== parsed.dueDate) {
    await item.update({ title: parsed.title.trim(), dueDate: parsed.dueDate });
  }
  if (parsed.isCompleted) {
    await TripChecklistCheck.findOrCreate({
      where: { itemId: item.id, userId: actorId },
      defaults: { itemId: item.id, userId: actorId, completedAt: new Date() },
    });
  } else {
    await TripChecklistCheck.destroy({ where: { itemId: item.id, userId: actorId } });
  }
  return {
    id: item.id,
    title: item.title,
    dueDate: item.dueDate,
    isCompleted: parsed.isCompleted,
  };
}

export async function deleteChecklist(tripId: string, actorId: string, itemId: string) {
  await requireTripAccess(tripId, actorId, true);
  const { TripChecklistItem } = getModels();
  const item = await TripChecklistItem.findOne({ where: { id: itemId, tripId } });
  if (!item) throw notFound("NOT_FOUND", "Checklist tidak ditemukan");
  await item.destroy();
  return { deleted: true as const };
}
