import { AuthErrorCode, enqueueGenerationSchema, type GeminiItinerary, type GenerationJob } from "@dolan/shared";
import { ZodError } from "zod";
import { env } from "../../config/env.ts";
import { HttpError } from "../../lib/api-error.ts";
import { buildBudgetSummary } from "./budget.ts";
import { parseGeminiItinerary, type GenerationModel } from "./gemini-adapter.ts";
import type { JobRecord, JobRepository } from "./job-repository.ts";
import { applyLockedStops, type LockedStop } from "./locked-stops.ts";
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
  verifyPlaces?: (itinerary: GeminiItinerary) => Promise<void>;
  requireDatabaseTrip?: boolean;
};

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

    const replayed = await this.jobs.findByIdempotency(input.actorId, parsed.idempotencyKey);
    if (replayed) {
      return { job: publicJob(replayed), created: false };
    }

    const active = await this.jobs.findActiveForTrip(trip.id);
    if (active) {
      throw new HttpError(409, AuthErrorCode.JOB_ALREADY_ACTIVE, "A generation job is already running");
    }

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
    if (claimed.resultVersionId) {
      return this.jobs.markSucceeded(claimed.id, claimed.resultVersionId);
    }

    try {
      const trip = await this.options.loadTrip?.(claimed.tripId);
      const raw = await this.model.generate({
        tripId: claimed.tripId,
        preferences: trip?.preferences ?? undefined,
      });
      let itinerary = parseGeminiItinerary(raw);
      assertRealPlaces(itinerary);
      await this.options.verifyPlaces?.(itinerary);
      const locked = (await this.options.loadLockedStops?.(claimed.selectedVersionId)) ?? [];
      itinerary = applyLockedStops(itinerary, locked);
      if (this.options.routes) {
        const coords = (await this.options.resolveCoords?.(itinerary)) ?? itinerary.days.flatMap((day) =>
          day.stops.map(() => null),
        );
        itinerary = await applyRouteLegs(itinerary, coords, this.options.routes);
      }

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
      return this.jobs.markSucceeded(claimed.id, versionId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      const code =
        error instanceof ZodError ||
        message === "INVALID_GENERATION" ||
        (error instanceof HttpError && error.status === 404)
          ? AuthErrorCode.INVALID_GENERATION
          : "PROVIDER_UNAVAILABLE";
      if (claimed.attemptCount < 2 && code === "PROVIDER_UNAVAILABLE") {
        return this.jobs.requeue(claimed.id);
      }
      return this.jobs.markFailed(claimed.id, code);
    }
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
    errorCode: job.errorCode,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}
