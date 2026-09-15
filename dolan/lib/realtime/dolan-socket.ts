"use client";

import { io, type Socket } from "socket.io-client";

export function connectDolanSocket(): Socket {
  const configured = process.env.NEXT_PUBLIC_SOCKET_URL?.trim();
  const sameOrigin = !configured;
  return io(sameOrigin ? undefined : configured, {
    withCredentials: true,
    path: "/socket.io",
    transports: sameOrigin ? ["polling", "websocket"] : ["websocket", "polling"],
    reconnection: true,
  });
}
