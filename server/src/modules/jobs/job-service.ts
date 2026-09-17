import {
  AuthErrorCode,
  destinationRecommendationsSchema,
  enqueueGenerationSchema,
  type GeminiItinerary,
  type GenerationJob,
} from "@dolan/shared";
import { ZodError } from "zod";
import { env } from "../../config/env.ts";
import { HttpError } from "../../lib/api-error.ts";
import { buildBudgetSummary } from "./budget.ts";
import { parseGeminiItinerary, type GenerationModel } from "./gemini-adapter.ts";
import type { JobRecord, JobRepository } from "./job-repository.ts";
import { applyLockedStops, type LockedStop } from "./locked-stops.ts";
import { dropDuplicateStops, packGeneratedSchedule, refineGeneratedBudget } from "./itinerary-optimize.ts";
import { assertRealPlaces } from "./place-guard.ts";
import { applyRouteLegs, type LatLng, type RoutesClient } from "./routes-adapter.ts";

export type DraftTrip = {
  id: string;
  hostUserId: string;
  selectedVersionId: string | null;
  preferences?: Record<string, unknown> | null;
  exists: true;
};

export type ItineraryVersionRecord = {
  id: string;
  tripId: string;
  source: "AI";
  budget: ReturnType<typeof buildBudgetSummary>;
};

export type JobServiceOptions = {
  loadTrip?: (tripId: string) => Promise<DraftTrip | null>;
  savePreferences?: (tripId: string, preferences: Record<string, unknown>) => Promise<void>;
  loadLockedStops?: (versionId: string | null) => Promise<LockedStop[]>;
  persistVersion?: (input: {
    jobId: string;
    tripId: string;
    requestedBy: string;
    itinerary: GeminiItinerary;
    source: "AI" | "REGENERATED";
  }) => Promise<string>;
  routes?: RoutesClient;
  resolveCoords?: (itinerary: GeminiItinerary) => Promise<Array<LatLng | null>>;
  hydratePlaces?: (
    itinerary: GeminiItinerary,
    bias?: { destinationCity?: string | null; minStopsPerDay?: number; maxStopsPerDay?: number },
  ) => Promise<GeminiItinerary>;
  verifyPlaces?: (itinerary: GeminiItinerary) => Promise<void>;
  requireDatabaseTrip?: boolean;
  onJobUpdated?: (job: GenerationJob) => void | Promise<void>;
  consumeAi?: (userId: string) => Promise<void>;
  consumeRoutes?: (userId: string) => Promise<void>;
};

const CHIJ_PLACE_ID = /^ChIJ/;

export class GenerationJobService {
  private readonly versions = new Map<string, ItineraryVersionRecord[]>();

  constructor(
    private readonly jobs: JobRepository,
    private readonly model: GenerationModel,
    private readonly options: JobServiceOptions = {},
  ) {}

  async enqueue(input: {
    tripId?: string;
    trip?: DraftTrip;
    actorId: string;
    body: unknown;
    idempotencyKey?: string;
  }): Promise<{ job: GenerationJob; created: boolean }> {
    const trip = await this.resolveTrip(input);

    const parsed = enqueueGenerationSchema.parse({
      ...(typeof input.body === "object" && input.body ? input.body : {}),
      idempotencyKey: input.idempotencyKey,
    });

    if (parsed.preferences && this.options.savePreferences) {
      await this.options.savePreferences(trip.id, parsed.preferences);
    }

    const replayed = await this.jobs.findByIdempotency(input.actorId, parsed.idempotencyKey);
    if (replayed) {
      return { job: publicJob(replayed), created: false };
    }

    const active = await this.jobs.findActiveForTrip(trip.id);
    if (active) {
      throw new HttpError(409, AuthErrorCode.JOB_ALREADY_ACTIVE, "A generation job is already running");
    }

    await this.options.consumeAi?.(input.actorId);

    const created = await this.jobs.createOrGetIdempotent({
      tripId: trip.id,
      requestedBy: input.actorId,
      type: parsed.type,
      idempotencyKey: parsed.idempotencyKey,
      selectedVersionId: trip.selectedVersionId,
    });

    return { job: publicJob(created.job), created: created.created };
  }

  async getById(id: string, actorId: string): Promise<GenerationJob> {
    const job = await this.jobs.getById(id);
    if (!job || job.requestedBy !== actorId) {
      throw new HttpError(404, "NOT_FOUND", "Generation job not found");
    }
    return publicJob(job);
  }

  getVersions(tripId: string): ItineraryVersionRecord[] {
    return this.versions.get(tripId) ?? [];
  }

  async processNext(workerId: string, now = new Date()): Promise<JobRecord | null> {
    await this.jobs.recoverStale(env.jobLockTimeoutMs, now);
    const claimed = await this.jobs.claimNextQueued(workerId, now);
    if (!claimed) return null;
    if (claimed.resultVersionId || (claimed.resultCandidates && claimed.resultCandidates.length > 0)) {
      const replayed = await this.jobs.markSucceeded(claimed.id, claimed.resultVersionId, {
        resultCandidates: claimed.resultCandidates ?? undefined,
      });
      await this.options.onJobUpdated?.(publicJob(replayed));
      return replayed;
    }

    try {
      if (claimed.type === "RECOMMEND_DESTINATIONS") {
        return await this.processRecommend(claimed);
      }
      return await this.processItinerary(claimed);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      const code =
        error instanceof ZodError ||
        message === "INVALID_GENERATION" ||
        (error instanceof HttpError && error.status === 404)
          ? AuthErrorCode.INVALID_GENERATION
          : "PROVIDER_UNAVAILABLE";
      if (claimed.attemptCount < 2 && code === "PROVIDER_UNAVAILABLE") {
        const requeued = await this.jobs.requeue(claimed.id);
        await this.options.onJobUpdated?.(publicJob(requeued));
        return requeued;
      }
      const failed = await this.jobs.markFailed(claimed.id, code);
      await this.options.onJobUpdated?.(publicJob(failed));
      return failed;
    }
  }

  private async processRecommend(claimed: JobRecord): Promise<JobRecord> {
    const trip = await this.options.loadTrip?.(claimed.tripId);
    const preferences = trip?.preferences ?? undefined;
    const raw = this.model.recommend
      ? await this.model.recommend({ tripId: claimed.tripId, preferences })
      : await this.model.generate({
          tripId: claimed.tripId,
          preferences: { ...(preferences ?? {}), recommendDestinations: true },
        });
    const parsed = destinationRecommendationsSchema.parse(raw);
    const candidates = parsed.candidates.filter((candidate) => CHIJ_PLACE_ID.test(candidate.googlePlaceId));
    if (candidates.length === 0) {
      throw new Error("INVALID_GENERATION");
    }
    const succeeded = await this.jobs.markSucceeded(claimed.id, null, { resultCandidates: candidates });
    await this.options.onJobUpdated?.(publicJob(succeeded));
    return succeeded;
  }

  private async processItinerary(claimed: JobRecord): Promise<JobRecord> {
    const trip = await this.options.loadTrip?.(claimed.tripId);
    const preferences = trip?.preferences ?? undefined;
    const raw = await this.model.generate({
      tripId: claimed.tripId,
      preferences,
    });
    let itinerary = parseGeminiItinerary(raw);
    const destinationCity =
      typeof preferences?.destinationCity === "string"
        ? preferences.destinationCity
        : typeof preferences?.destinationLabel === "string"
          ? preferences.destinationLabel
          : null;
    if (this.options.hydratePlaces) {
      itinerary = await this.options.hydratePlaces(itinerary, {
        destinationCity,
        minStopsPerDay: Number(preferences?.minStopsPerDay ?? 4),
        maxStopsPerDay: Number(preferences?.maxStopsPerDay ?? 6),
      });
    }
    assertRealPlaces(itinerary);
    await this.options.verifyPlaces?.(itinerary);
    const locked = (await this.options.loadLockedStops?.(claimed.selectedVersionId)) ?? [];
    itinerary = dropDuplicateStops(applyLockedStops(itinerary, locked), true);
    itinerary = {
      ...itinerary,
      days: itinerary.days.filter((day) => day.stops.length > 0),
    };
    if (!itinerary.days.length) {
      throw new Error("INVALID_GENERATION");
    }
    if (this.options.routes) {
      await this.options.consumeRoutes?.(claimed.requestedBy);
      const coords = (await this.options.resolveCoords?.(itinerary)) ?? itinerary.days.flatMap((day) =>
        day.stops.map(() => null),
      );
      itinerary = await applyRouteLegs(itinerary, coords, this.options.routes);
    }
    itinerary = packGeneratedSchedule(itinerary);
    itinerary = refineGeneratedBudget(itinerary, preferences);

    const budget = buildBudgetSummary(itinerary.budgetItems);
    const versionId = this.options.persistVersion
      ? await this.options.persistVersion({
          jobId: claimed.id,
          tripId: claimed.tripId,
          requestedBy: claimed.requestedBy,
          itinerary,
          source: claimed.type === "REGENERATE_ITINERARY" ? "REGENERATED" : "AI",
        })
      : crypto.randomUUID();

    if (!this.options.persistVersion) {
      this.versions.set(claimed.tripId, [
        ...(this.versions.get(claimed.tripId) ?? []),
        { id: versionId, tripId: claimed.tripId, source: "AI", budget },
      ]);
    }
    const succeeded = await this.jobs.markSucceeded(claimed.id, versionId);
    await this.options.onJobUpdated?.(publicJob(succeeded));
    return succeeded;
  }

  private async resolveTrip(input: { tripId?: string; trip?: DraftTrip; actorId: string }): Promise<DraftTrip> {
    if (input.trip) {
      if (input.trip.hostUserId !== input.actorId) {
        throw new HttpError(403, AuthErrorCode.NOT_HOST, "Only the draft owner can generate an itinerary");
      }
      return input.trip;
    }

    const tripId = input.tripId;
    if (!tripId) {
      throw new HttpError(400, "VALIDATION_ERROR", "tripId is required");
    }
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(tripId)) {
      if (this.options.requireDatabaseTrip) {
        throw new HttpError(404, "NOT_FOUND", "Trip not found");
      }
      return {
        id: tripId,
        hostUserId: input.actorId,
        selectedVersionId: null,
        exists: true,
      };
    }

    const loaded = await this.options.loadTrip?.(tripId);
    if (loaded) {
      if (loaded.hostUserId !== input.actorId) {
        throw new HttpError(403, AuthErrorCode.NOT_HOST, "Only the draft owner can generate an itinerary");
      }
      return loaded;
    }

    if (this.options.requireDatabaseTrip) {
      throw new HttpError(404, "NOT_FOUND", "Trip not found");
    }

    return {
      id: tripId,
      hostUserId: input.actorId,
      selectedVersionId: null,
      exists: true,
    };
  }
}

function publicJob(job: JobRecord): GenerationJob {
  return {
    id: job.id,
    tripId: job.tripId,
    requestedBy: job.requestedBy,
    type: job.type,
    status: job.status,
    attemptCount: job.attemptCount,
    resultVersionId: job.resultVersionId,
    selectedVersionId: job.selectedVersionId,
    resultCandidates: job.resultCandidates ?? null,
    errorCode: job.errorCode,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}
