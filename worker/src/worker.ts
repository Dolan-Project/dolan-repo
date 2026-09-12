import { createJobService } from "../../server/src/container.ts";
import { logger } from "../../server/src/lib/logger.ts";
import { startGenerationWorker } from "../../server/src/modules/jobs/run-worker.ts";

const jobs = createJobService();
startGenerationWorker(jobs);
logger.info("Standalone worker process online. Shared job storage requires Wira generation_jobs table.");
