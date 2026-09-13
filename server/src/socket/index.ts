import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { AuthErrorCode } from "@dolan/shared";
import { env } from "../config/env.ts";
import { logger } from "../lib/logger.ts";
import { HttpError } from "../lib/api-error.ts";
import type { AuthService } from "../modules/auth/auth-service.ts";
import type { ChatService } from "../modules/chat/chat-service.ts";
import { extractAccessTokenFromCookies } from "./cookie-auth.ts";
import { SocketSessionRegistry } from "./session-registry.ts";

function roomName(tripId: string) {
  return `trip:${tripId}`;
}

export function createSocketServer(httpServer: HttpServer, authService: AuthService, chat?: ChatService) {
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
    socket.on("room.join", async (payload: { tripId?: string }, ack?: (result: unknown) => void) => {
      try {
        const tripId = String(payload?.tripId ?? "");
        const userId = String(socket.data.userId);
        if (!chat) throw new Error(AuthErrorCode.FORBIDDEN);
        chat.assertCanRead(await chat.accessFor(tripId, userId));
        await socket.join(roomName(tripId));
        ack?.({ ok: true, room: roomName(tripId) });
      } catch (error) {
        const code = error instanceof HttpError ? error.code : AuthErrorCode.FORBIDDEN;
        ack?.({ ok: false, code });
        socket.emit("error", { code });
      }
    });

    socket.on("message.send", async (payload: { tripId?: string; clientMessageId?: string; body?: string }, ack?: (result: unknown) => void) => {
      try {
        if (!chat) throw new Error(AuthErrorCode.FORBIDDEN);
        const result = await chat.sendMessage(String(payload?.tripId ?? ""), String(socket.data.userId), payload);
        ack?.({ ok: true, message: result.message, created: result.created });
      } catch (error) {
        const code = error instanceof HttpError ? error.code : "VALIDATION_ERROR";
        ack?.({ ok: false, code });
      }
    });

    socket.on("disconnect", () => {
      registry.forget(socket.id);
    });
  });

  chat?.setRealtime({
    emitToRoom(tripId, event, payload) {
      io.to(roomName(tripId)).emit(event, payload);
    },
    emitToUser(userId, event, payload) {
      for (const socketId of registry.socketIds(userId)) {
        io.to(socketId).emit(event, payload);
      }
    },
    leaveRoom(userId, tripId) {
      for (const socketId of registry.socketIds(userId)) {
        io.sockets.sockets.get(socketId)?.leave(roomName(tripId));
      }
    },
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
