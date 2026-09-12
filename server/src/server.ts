import { createServer } from "node:http";
import { assertDatabaseConnection, initModels } from "@dolan/database";
import { env } from "./config/env.ts";
import { createApp } from "./app.ts";
import { createAuthService, createProductionSearchService } from "./container.ts";
import { logger } from "./lib/logger.ts";
import { createSocketServer, logSocketReady } from "./socket/index.ts";

async function main() {
  initModels();
  await assertDatabaseConnection();

  const authService = createAuthService();
  const httpServer = createServer();
  const sockets = createSocketServer(httpServer, authService);
  const app = createApp(authService, sockets.disconnectUser, createProductionSearchService());

  httpServer.on("request", app);

  httpServer.listen(env.port, () => {
    logger.info("Dolan API listening", {
      port: env.port,
      authAdapter: env.authAdapter,
      googlePlacesConfigured: Boolean(env.googleMapsServerKey),
    });
    logSocketReady();
  });
}

main().catch((error) => {
  logger.error("Failed to start Dolan API", {
    name: error instanceof Error ? error.name : "UnknownError",
    message: error instanceof Error ? error.message : "Unknown error",
  });
  process.exit(1);
});
