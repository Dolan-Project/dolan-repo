import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { AuthErrorCode } from "@dolan/shared";
import { env } from "../config/env.ts";
import { logger } from "../lib/logger.ts";
import type { AuthService } from "../modules/auth/auth-service.ts";
import { extractAccessTokenFromCookies } from "./cookie-auth.ts";
import { SocketSessionRegistry } from "./session-registry.ts";

export function createSocketServer(httpServer: HttpServer, authService: AuthService) {
  const registry = new SocketSessionRegistry();
  const io = new Server(httpServer, {
    path: env.socketPath,
    cors: {
      origin: env.corsOrigins,
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = extractAccessTokenFromCookies(
        socket.handshake.headers.cookie,
        env.supabaseCookiePrefix,
      );
      if (!token) {
        next(new Error(AuthErrorCode.UNAUTHENTICATED));
        return;
      }
      const user = await authService.resolveSession(token);
      socket.data.userId = user.id;
      registry.register(user.id, socket);
      next();
    } catch {
      next(new Error(AuthErrorCode.INVALID_TOKEN));
    }
  });

  io.on("connection", (socket) => {
    socket.on("disconnect", () => {
      registry.forget(socket.id);
    });
  });

  return {
    io,
    registry,
    disconnectUser(userId: string) {
      return registry.disconnectUser(userId, (socketId) => {
        io.sockets.sockets.get(socketId)?.disconnect(true);
      });
    },
  };
}

export function logSocketReady() {
  logger.info("Socket.IO cookie authentication enabled", { path: env.socketPath });
}
