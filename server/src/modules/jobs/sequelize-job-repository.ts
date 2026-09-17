import { getModels, getSequelize } from "@dolan/database";
import type { GenerationJob as GenerationJobRow } from "@dolan/database";
import type { DestinationRecommendation } from "@dolan/shared";
import { QueryTypes } from "sequelize";
import { env } from "../../config/env.ts";
import type {
  CreateJobInput,
  JobRecord,
  JobRepository,
  MarkSucceededPayload,
} from "./job-repository.ts";

export class SequelizeJobRepository implements JobRepository {
  async createOrGetIdempotent(input: CreateJobInput): Promise<{ job: JobRecord; created: boolean }> {
    const existing = await this.findByIdempotency(input.requestedBy, input.idempotencyKey);
    if (existing) return { job: existing, created: false };

    const { GenerationJob } = getModels();
    const created = await GenerationJob.create({
      tripId: input.tripId,
      requestedByUserId: input.requestedBy,
      type: input.type,
      status: "QUEUED",
      idempotencyKey: input.idempotencyKey,
      selectedItineraryVersionId: input.selectedVersionId,
      attemptCount: 0,
    });
    return { job: await toRecord(created, input.selectedVersionId), created: true };
  }

  async getById(id: string): Promise<JobRecord | null> {
    const { GenerationJob } = getModels();
    const job = await GenerationJob.findByPk(id);
    return job ? toRecord(job) : null;
  }

  async findByIdempotency(actorId: string, key: string): Promise<JobRecord | null> {
    const { GenerationJob } = getModels();
    const job = await GenerationJob.findOne({
      where: { requestedByUserId: actorId, idempotencyKey: key },
    });
    return job ? toRecord(job) : null;
  }

  async findActiveForTrip(tripId: string): Promise<JobRecord | null> {
    const { GenerationJob } = getModels();
    const job = await GenerationJob.findOne({
      where: { tripId, status: ["QUEUED", "PROCESSING"] },
    });
    return job ? toRecord(job) : null;
  }

  async claimNextQueued(workerId: string, now = new Date()): Promise<JobRecord | null> {
    const sequelize = getSequelize();
    const claimed = await sequelize.transaction(async (transaction) => {
      const rows = await sequelize.query<{ id: string }>(
        `SELECT id FROM generation_jobs
         WHERE status = 'QUEUED'
           AND (
             attempt_count = 0
             OR updated_at <= NOW() - ((:backoffMs / 1000.0) * POWER(2, GREATEST(attempt_count - 1, 0))) * INTERVAL '1 second'
           )
         ORDER BY created_at ASC
         LIMIT 1
         FOR UPDATE SKIP LOCKED`,
        {
          transaction,
          type: QueryTypes.SELECT,
          replacements: { backoffMs: env.jobRetryBackoffMs },
        },
      );
      const id = rows[0]?.id;
      if (!id) return null;
      const { GenerationJob } = getModels();
      const job = await GenerationJob.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!job) return null;
      job.status = "PROCESSING";
      job.attemptCount = job.attemptCount + 1;
      job.lockedBy = workerId;
      job.lockedAt = now;
      job.startedAt = job.startedAt ?? now;
      await job.save({ transaction });
      return job;
    });
    return claimed ? toRecord(claimed) : null;
  }

  async recoverStale(lockTimeoutMs: number, now = new Date()): Promise<number> {
    const { GenerationJob } = getModels();
    const processing = await GenerationJob.findAll({ where: { status: "PROCESSING" } });
    let recovered = 0;
    for (const job of processing) {
      if (!job.lockedAt) continue;
      if (now.getTime() - job.lockedAt.getTime() <= lockTimeoutMs) continue;
      if (job.attemptCount >= 2) {
        job.status = "FAILED";
        job.errorCode = "JOB_TIMEOUT";
      } else {
        job.status = "QUEUED";
      }
      job.lockedBy = null;
      job.lockedAt = null;
      await job.save();
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
    const { GenerationJob } = getModels();
    const job = await GenerationJob.findByPk(id);
    if (!job) throw new Error(`Job ${id} not found`);
    job.status = "SUCCEEDED";
    job.resultVersionId = payload.resultVersionId ?? null;
    if (payload.resultCandidates) {
      job.resultPayload = { candidates: payload.resultCandidates };
    }
    job.finishedAt = new Date();
    job.lockedBy = null;
    job.lockedAt = null;
    job.errorCode = null;
    await job.save();
    return toRecord(job);
  }

  async markFailed(id: string, errorCode: string): Promise<JobRecord> {
    const { GenerationJob } = getModels();
    const job = await GenerationJob.findByPk(id);
    if (!job) throw new Error(`Job ${id} not found`);
    job.status = "FAILED";
    job.errorCode = errorCode;
    job.finishedAt = new Date();
    job.lockedBy = null;
    job.lockedAt = null;
    await job.save();
    return toRecord(job);
  }

  async requeue(id: string): Promise<JobRecord> {
    const { GenerationJob } = getModels();
    const job = await GenerationJob.findByPk(id);
    if (!job) throw new Error(`Job ${id} not found`);
    job.status = "QUEUED";
    job.lockedBy = null;
    job.lockedAt = null;
    await job.save();
    return toRecord(job);
  }
}

function candidatesFromPayload(payload: Record<string, unknown> | null | undefined): DestinationRecommendation[] | null {
  if (!payload || !Array.isArray(payload.candidates)) return null;
  return payload.candidates as DestinationRecommendation[];
}

async function toRecord(job: GenerationJobRow, selectedVersionId?: string | null): Promise<JobRecord> {
  return {
    id: job.id,
    tripId: job.tripId,
    requestedBy: job.requestedByUserId,
    type: job.type as JobRecord["type"],
    status: job.status,
    attemptCount: job.attemptCount,
    resultVersionId: job.resultVersionId,
    selectedVersionId: selectedVersionId ?? job.selectedItineraryVersionId ?? null,
    resultCandidates: candidatesFromPayload(job.resultPayload),
    errorCode: job.errorCode,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
    idempotencyKey: job.idempotencyKey,
    lockedBy: job.lockedBy,
    lockedAt: job.lockedAt ? job.lockedAt.toISOString() : null,
    draftPreserved: true,
  };
}
