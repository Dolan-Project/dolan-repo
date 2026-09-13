import { getModels, getSequelize } from "@dolan/database";
import type { GeminiItinerary } from "@dolan/shared";
import { buildBudgetSummary } from "./budget.ts";
import type { LockedStop } from "./locked-stops.ts";

export async function loadSelectedVersionId(tripId: string): Promise<string | null> {
  const { Trip } = getModels();
  const trip = await Trip.findByPk(tripId);
  return trip?.currentItineraryVersionId ?? null;
}

export async function loadLockedStops(versionId: string | null): Promise<LockedStop[]> {
  if (!versionId) return [];
  const { ItineraryDay, ItineraryStop, Place } = getModels();
  const days = await ItineraryDay.findAll({ where: { itineraryVersionId: versionId } });
  const locked: LockedStop[] = [];
  for (const day of days) {
    const stops = await ItineraryStop.findAll({ where: { itineraryDayId: day.id, isLocked: true } });
    for (const stop of stops) {
      const place = stop.placeId ? await Place.findByPk(stop.placeId) : null;
      locked.push({
        dayNumber: day.dayNumber,
        googlePlaceId: place?.googlePlaceId ?? null,
        customTitle: stop.customTitle,
        activityType: stop.activityType,
        durationMinutes: stop.durationMinutes,
        notes: stop.notes,
      });
    }
  }
  return locked;
}

export async function persistGeneratedVersion(input: {
  jobId?: string;
  tripId: string;
  requestedBy: string;
  itinerary: GeminiItinerary;
  source: "AI" | "REGENERATED";
}): Promise<string> {
  const sequelize = getSequelize();
  const { ItineraryVersion, ItineraryDay, ItineraryStop, Place, BudgetItem, Trip, GenerationJob } = getModels();

  return sequelize.transaction(async (transaction) => {
    if (input.jobId) {
      const existingJob = await GenerationJob.findByPk(input.jobId, { transaction, lock: transaction.LOCK.UPDATE });
      if (existingJob?.resultVersionId) {
        return existingJob.resultVersionId;
      }
    }

    const current = await Trip.findByPk(input.tripId, { transaction });
    if (!current) {
      throw new Error("INVALID_GENERATION");
    }

    const maxVersion = Number(
      (await ItineraryVersion.max("versionNumber", { where: { tripId: input.tripId }, transaction })) ?? 0,
    );

    const version = await ItineraryVersion.create(
      {
        tripId: input.tripId,
        versionNumber: maxVersion + 1,
        createdByUserId: input.requestedBy,
        source: input.source,
        summary: input.itinerary.summary,
        assumptions: input.itinerary.assumptions as never,
      },
      { transaction },
    );

    const budget = buildBudgetSummary(input.itinerary.budgetItems);

    for (const day of input.itinerary.days) {
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
        if (stop.place) {
          const [place] = await Place.findOrCreate({
            where: { googlePlaceId: stop.place.googlePlaceId },
            defaults: {
              googlePlaceId: stop.place.googlePlaceId,
              cachedName: stop.place.name,
              cachedCity: stop.place.city,
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

    if (input.jobId) {
      const job = await GenerationJob.findByPk(input.jobId, { transaction, lock: transaction.LOCK.UPDATE });
      if (job) {
        job.status = "SUCCEEDED";
        job.resultVersionId = version.id;
        job.finishedAt = new Date();
        job.lockedBy = null;
        job.lockedAt = null;
        job.errorCode = null;
        await job.save({ transaction });
      }
    }

    await current.reload({ transaction });
    return version.id;
  });
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export async function loadDraftTrip(tripId: string) {
  if (!isUuid(tripId)) return null;
  const { Trip } = getModels();
  const trip = await Trip.findByPk(tripId);
  if (!trip) return null;
  return {
    id: trip.id,
    hostUserId: trip.hostUserId,
    selectedVersionId: trip.currentItineraryVersionId ?? null,
    preferences: trip.preferences ?? null,
    exists: true as const,
  };
}
