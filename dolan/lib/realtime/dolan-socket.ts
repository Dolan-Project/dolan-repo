"use client";

import { io, type Socket } from "socket.io-client";

let shared: Socket | null = null;

function originOf(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  try {
    return new URL(trimmed).origin;
  } catch {
    return undefined;
  }
}

/**
 * The Next.js rewrite for /socket.io only proxies HTTP, so a same-origin socket
 * never finishes the websocket upgrade and every long-poll gets recycled. Always
 * talk to the Express origin directly when we can work out where it lives.
 */
export function socketOrigin() {
  return originOf(process.env.NEXT_PUBLIC_SOCKET_URL) ?? originOf(process.env.NEXT_PUBLIC_API_URL);
}

export function connectDolanSocket(): Socket {
  if (shared) return shared;
  const origin = socketOrigin();
  shared = io(origin, {
    withCredentials: true,
    path: "/socket.io",
    transports: origin ? ["websocket", "polling"] : ["polling"],
    tryAllTransports: true,
    upgrade: Boolean(origin),
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 500,
    reconnectionDelayMax: 4000,
    randomizationFactor: 0.3,
    timeout: 8000,
  });
  return shared;
}

export function disconnectDolanSocket() {
  shared?.disconnect();
  shared = null;
}
