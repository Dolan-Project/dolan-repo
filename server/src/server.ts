import { createServer } from "node:http";
import { assertDatabaseConnection, initModels } from "@dolan/database";
import { env } from "./config/env.ts";
import { createApp } from "./app.ts";
import {
  createAuthAdapter,
  createJobService,
  createProductionJobService,
  createProductionSearchService,
  createProductionTripService,
  createUserRepository,
} from "./container.ts";
import { logger } from "./lib/logger.ts";
import { AuthService } from "./modules/auth/auth-service.ts";
import { startGenerationWorker } from "./modules/jobs/run-worker.ts";
import { createSocketServer, logSocketReady } from "./socket/index.ts";

async function main() {
  let databaseReady = false;
  try {
    initModels();
    await assertDatabaseConnection();
    databaseReady = true;
  } catch (error) {
    if (env.nodeEnv === "production") {
      throw error;
    }
    logger.warn("Database unavailable; using in-memory user repository");
  }

  const authService = new AuthService(createAuthAdapter(), createUserRepository(databaseReady));
  const jobService = databaseReady ? createProductionJobService() : createJobService();
  const httpServer = createServer();
  const sockets = createSocketServer(httpServer, authService);
  const app = createApp(
    authService,
    sockets.disconnectUser,
    databaseReady ? createProductionSearchService() : undefined,
    jobService,
    databaseReady ? createProductionTripService() : undefined,
  );

  httpServer.on("request", app);

  httpServer.listen(env.port, () => {
    logger.info("Dolan API listening", {
      port: env.port,
      authAdapter: env.authAdapter,
      userRepository: databaseReady ? "sequelize" : "memory",
      googlePlacesConfigured: Boolean(env.googleMapsServerKey),
    });
    logSocketReady();
    startGenerationWorker(jobService);
  });
}

main().catch((error) => {
  logger.error("Failed to start Dolan API", {
    name: error instanceof Error ? error.name : "UnknownError",
    message: error instanceof Error ? error.message : "Unknown error",
  });
  process.exit(1);
});
