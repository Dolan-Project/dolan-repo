import { env } from "../../config/env.ts";
import { logger } from "../../lib/logger.ts";
import type { GenerationJobService } from "./job-service.ts";

export function startGenerationWorker(jobs: GenerationJobService, workerId = env.workerId) {
  const interval = setInterval(() => {
    void jobs.processNext(workerId).catch((error) => {
      logger.error("Worker tick failed", { name: error instanceof Error ? error.name : "UnknownError" });
    });
  }, env.jobPollIntervalMs);

  logger.info("Generation worker started", { workerId, intervalMs: env.jobPollIntervalMs });
  return () => clearInterval(interval);
}
