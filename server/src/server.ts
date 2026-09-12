import { createServer } from "node:http";
import { env } from "./config/env.ts";
import { createApp } from "./app.ts";
import { createAuthService, createJobService } from "./container.ts";
import { logger } from "./lib/logger.ts";
import { startGenerationWorker } from "./modules/jobs/run-worker.ts";
import { createSocketServer, logSocketReady } from "./socket/index.ts";

const authService = createAuthService();
const jobService = createJobService();
const httpServer = createServer();
const sockets = createSocketServer(httpServer, authService);
const app = createApp(authService, sockets.disconnectUser, jobService);

httpServer.on("request", app);

httpServer.listen(env.port, () => {
  logger.info("Dolan API listening", { port: env.port, authAdapter: env.authAdapter });
  logSocketReady();
  startGenerationWorker(jobService);
});
