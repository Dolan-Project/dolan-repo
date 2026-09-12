import { AuthErrorCode, enqueueGenerationSchema, type GenerationJob } from "@dolan/shared";
import { env } from "../../config/env.ts";
import { HttpError } from "../../lib/api-error.ts";
import { buildBudgetSummary } from "./budget.ts";
import { parseGeminiItinerary, type GenerationModel } from "./gemini-adapter.ts";
import type { JobRecord, JobRepository } from "./job-repository.ts";

export type DraftTrip = {
  id: string;
  hostUserId: string;
  selectedVersionId: string | null;
  exists: true;
};

export type ItineraryVersionRecord = {
  id: string;
  tripId: string;
  source: "AI";
  budget: ReturnType<typeof buildBudgetSummary>;
};

export class GenerationJobService {
  private readonly versions = new Map<string, ItineraryVersionRecord[]>();

  constructor(
    private readonly jobs: JobRepository,
    private readonly model: GenerationModel,
  ) {}

  async enqueue(input: {
    trip: DraftTrip;
    actorId: string;
    body: unknown;
    idempotencyKey?: string;
  }): Promise<{ job: GenerationJob; created: boolean }> {
    if (input.trip.hostUserId !== input.actorId) {
      throw new HttpError(403, AuthErrorCode.NOT_HOST, "Only the draft owner can generate an itinerary");
    }

    const parsed = enqueueGenerationSchema.parse({
      ...(typeof input.body === "object" && input.body ? input.body : {}),
      idempotencyKey: input.idempotencyKey,
    });

    const replayed = await this.jobs.findByIdempotency(input.actorId, parsed.idempotencyKey);
    if (replayed) {
      return { job: publicJob(replayed), created: false };
    }

    const active = await this.jobs.findActiveForTrip(input.trip.id);
    if (active) {
      throw new HttpError(409, AuthErrorCode.JOB_ALREADY_ACTIVE, "A generation job is already running");
    }

    const created = await this.jobs.createOrGetIdempotent({
      tripId: input.trip.id,
      requestedBy: input.actorId,
      type: parsed.type,
      idempotencyKey: parsed.idempotencyKey,
      selectedVersionId: input.trip.selectedVersionId,
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

    try {
      const raw = await this.model.generate({ tripId: claimed.tripId });
      const itinerary = parseGeminiItinerary(raw);
      const fakePlace = itinerary.days.some((day) =>
        day.stops.some((stop) => stop.place && !stop.place.googlePlaceId.startsWith("ChIJ")),
      );
      if (fakePlace) {
        throw new Error("INVALID_GENERATION");
      }

      const budget = buildBudgetSummary(itinerary.budgetItems);
      const version: ItineraryVersionRecord = {
        id: crypto.randomUUID(),
        tripId: claimed.tripId,
        source: "AI",
        budget,
      };
      const existing = this.versions.get(claimed.tripId) ?? [];
      this.versions.set(claimed.tripId, [...existing, version]);
      return this.jobs.markSucceeded(claimed.id, version.id);
    } catch (error) {
      const code = error instanceof Error && error.message === "INVALID_GENERATION"
        ? AuthErrorCode.INVALID_GENERATION
        : "PROVIDER_UNAVAILABLE";
      if (claimed.attemptCount < 2 && code === "PROVIDER_UNAVAILABLE") {
        return this.jobs.requeue(claimed.id);
      }
      return this.jobs.markFailed(claimed.id, code);
    }
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
