import type {
  DestinationRecommendation,
  GenerationJob,
  GenerationJobStatus,
  GenerationJobType,
} from "@dolan/shared";
import { env } from "../../config/env.ts";
import { isJobReadyForClaim } from "./backoff.ts";

export type JobRecord = GenerationJob & {
  idempotencyKey: string;
  lockedBy: string | null;
  lockedAt: string | null;
  draftPreserved: true;
};

export type CreateJobInput = {
  tripId: string;
  requestedBy: string;
  type: GenerationJobType;
  idempotencyKey: string;
  selectedVersionId: string | null;
};

export type MarkSucceededPayload = {
  resultVersionId?: string | null;
  resultCandidates?: DestinationRecommendation[];
};

export interface JobRepository {
  createOrGetIdempotent(input: CreateJobInput): Promise<{ job: JobRecord; created: boolean }>;
  getById(id: string): Promise<JobRecord | null>;
  findByIdempotency(actorId: string, key: string): Promise<JobRecord | null>;
  findActiveForTrip(tripId: string): Promise<JobRecord | null>;
  claimNextQueued(workerId: string, now?: Date): Promise<JobRecord | null>;
  recoverStale(lockTimeoutMs: number, now?: Date): Promise<number>;
  markSucceeded(
    id: string,
    resultVersionId: string | null,
    payload?: Pick<MarkSucceededPayload, "resultCandidates">,
  ): Promise<JobRecord>;
  markSucceededWithPayload(id: string, payload: MarkSucceededPayload): Promise<JobRecord>;
  markFailed(id: string, errorCode: string): Promise<JobRecord>;
  requeue(id: string): Promise<JobRecord>;
}

const ACTIVE: GenerationJobStatus[] = ["QUEUED", "PROCESSING"];

export class MemoryJobRepository implements JobRepository {
  private readonly jobs = new Map<string, JobRecord>();

  async createOrGetIdempotent(input: CreateJobInput): Promise<{ job: JobRecord; created: boolean }> {
    const existing = [...this.jobs.values()].find(
      (job) => job.requestedBy === input.requestedBy && job.idempotencyKey === input.idempotencyKey,
    );
    if (existing) return { job: existing, created: false };

    const now = new Date().toISOString();
    const job: JobRecord = {
      id: crypto.randomUUID(),
      tripId: input.tripId,
      requestedBy: input.requestedBy,
      type: input.type,
      status: "QUEUED",
      attemptCount: 0,
      resultVersionId: null,
      selectedVersionId: input.selectedVersionId,
      resultCandidates: null,
      errorCode: null,
      createdAt: now,
      updatedAt: now,
      idempotencyKey: input.idempotencyKey,
      lockedBy: null,
      lockedAt: null,
      draftPreserved: true,
    };
    this.jobs.set(job.id, job);
    return { job, created: true };
  }

  async getById(id: string): Promise<JobRecord | null> {
    return this.jobs.get(id) ?? null;
  }

  async findByIdempotency(actorId: string, key: string): Promise<JobRecord | null> {
    return (
      [...this.jobs.values()].find((job) => job.requestedBy === actorId && job.idempotencyKey === key) ?? null
    );
  }

  async findActiveForTrip(tripId: string): Promise<JobRecord | null> {
    return [...this.jobs.values()].find((job) => job.tripId === tripId && ACTIVE.includes(job.status)) ?? null;
  }

  async claimNextQueued(workerId: string, now = new Date()): Promise<JobRecord | null> {
    const next = [...this.jobs.values()]
      .filter((job) => job.status === "QUEUED" && isJobReadyForClaim(job, now, env.jobRetryBackoffMs))
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt))[0];
    if (!next) return null;
    const claimed: JobRecord = {
      ...next,
      status: "PROCESSING",
      attemptCount: next.attemptCount + 1,
      lockedBy: workerId,
      lockedAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    this.jobs.set(claimed.id, claimed);
    return claimed;
  }

  async recoverStale(lockTimeoutMs: number, now = new Date()): Promise<number> {
    let recovered = 0;
    for (const job of this.jobs.values()) {
      if (job.status !== "PROCESSING" || !job.lockedAt) continue;
      const age = now.getTime() - new Date(job.lockedAt).getTime();
      if (age <= lockTimeoutMs) continue;
      if (job.attemptCount >= 2) {
        this.jobs.set(job.id, {
          ...job,
          status: "FAILED",
          errorCode: "JOB_TIMEOUT",
          lockedBy: null,
          lockedAt: null,
          updatedAt: now.toISOString(),
          draftPreserved: true,
        });
      } else {
        this.jobs.set(job.id, {
          ...job,
          status: "QUEUED",
          lockedBy: null,
          lockedAt: null,
          updatedAt: now.toISOString(),
        });
      }
      recovered += 1;
    }
    return recovered;
  }

  async markSucceeded(
    id: string,
    resultVersionId: string | null,
    payload?: Pick<MarkSucceededPayload, "resultCandidates">,
  ): Promise<JobRecord> {
    return this.markSucceededWithPayload(id, {
      resultVersionId,
      resultCandidates: payload?.resultCandidates,
    });
  }

  async markSucceededWithPayload(id: string, payload: MarkSucceededPayload): Promise<JobRecord> {
    const current = this.require(id);
    const next: JobRecord = {
      ...current,
      status: "SUCCEEDED",
      resultVersionId: payload.resultVersionId ?? null,
      resultCandidates: payload.resultCandidates ?? current.resultCandidates ?? null,
      lockedBy: null,
      lockedAt: null,
      updatedAt: new Date().toISOString(),
      draftPreserved: true,
    };
    this.jobs.set(id, next);
    return next;
  }

  async markFailed(id: string, errorCode: string): Promise<JobRecord> {
    const current = this.require(id);
    const next = {
      ...current,
      status: "FAILED" as const,
      errorCode,
      lockedBy: null,
      lockedAt: null,
      updatedAt: new Date().toISOString(),
      draftPreserved: true as const,
    };
    this.jobs.set(id, next);
    return next;
  }

  async requeue(id: string): Promise<JobRecord> {
    const current = this.require(id);
    const next = {
      ...current,
      status: "QUEUED" as const,
      lockedBy: null,
      lockedAt: null,
      updatedAt: new Date().toISOString(),
    };
    this.jobs.set(id, next);
    return next;
  }

  private require(id: string): JobRecord {
    const job = this.jobs.get(id);
    if (!job) throw new Error(`Job ${id} not found`);
    return job;
  }
}
