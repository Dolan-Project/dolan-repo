import { createServer } from "node:http";
import { assertDatabaseConnection, initModels } from "@dolan/database";
import { env } from "./config/env.ts";
import { createApp } from "./app.ts";
import {
  createAuthAdapter,
  createChatService,
  createItineraryExportService,
  createJobService,
  createLocationService,
  createMemorySocialStore,
  createMemoryTripService,
  createProductionJobService,
  createProductionSocialStore,
  createProductionTripService,
  createRuntimeSearchService,
  createShareLinkService,
  createUserRepository,
} from "./container.ts";
import { envRateLimit } from "./middleware/rate-limit.ts";
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
  const chatService = createChatService(databaseReady);
  const onJobUpdated = (job: {
    id: string;
    tripId: string;
    status: string;
    resultVersionId: string | null;
    errorCode: string | null;
  }) => {
    void chatService.emitGenerationUpdated(job);
  };
  const jobService = databaseReady ? createProductionJobService(onJobUpdated) : createJobService(onJobUpdated);
  const social = databaseReady ? createProductionSocialStore() : createMemorySocialStore();
  const trips = databaseReady
    ? createProductionTripService(chatService)
    : createMemoryTripService(undefined, chatService, social);
  const httpServer = createServer();
  const sockets = createSocketServer(httpServer, authService, chatService);
  const app = createApp(
    authService,
    sockets.disconnectUser,
    createRuntimeSearchService(databaseReady),
    jobService,
    trips,
    chatService,
    envRateLimit(),
    social,
    createLocationService(chatService, databaseReady),
    createShareLinkService(chatService, databaseReady),
    createItineraryExportService(chatService, databaseReady),
  );

  httpServer.on("request", app);

  httpServer.listen(env.port, () => {
    logger.info("Dolan API listening", {
      port: env.port,
      authAdapter: env.authAdapter,
      userRepository: databaseReady ? "sequelize" : "memory",
      searchRepository: databaseReady ? "sequelize" : "memory",
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
