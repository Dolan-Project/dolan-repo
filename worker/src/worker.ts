import { assertDatabaseConnection, initModels } from "@dolan/database";
import { createJobService, createProductionJobService } from "../../server/src/container.ts";
import { logger } from "../../server/src/lib/logger.ts";
import { startGenerationWorker } from "../../server/src/modules/jobs/run-worker.ts";

async function main() {
  try {
    initModels();
    await assertDatabaseConnection();
    startGenerationWorker(createProductionJobService());
    logger.info("Standalone worker using generation_jobs");
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      throw error;
    }
    startGenerationWorker(createJobService());
    logger.warn("Standalone worker using in-memory jobs; Postgres unavailable");
  }
}

void main();
