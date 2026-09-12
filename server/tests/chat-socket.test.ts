import { createServer } from "node:http";
import { io as ioc, type Socket as ClientSocket } from "socket.io-client";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.ts";
import { createJobService, createMemorySearchService, createMemoryTripService } from "../src/container.ts";
import { MockAuthAdapter } from "../src/integrations/supabase/mock-auth-adapter.ts";
import { AuthService } from "../src/modules/auth/auth-service.ts";
import { ChatService } from "../src/modules/chat/chat-service.ts";
import { MemoryChatStore } from "../src/modules/chat/memory-chat-store.ts";
import { MemoryUserRepository } from "../src/modules/auth/user-repository.ts";
import { createSocketServer } from "../src/socket/index.ts";

const HOST = "11111111-1111-4111-8111-111111111111";
const MEMBER = "44444444-4444-4444-8444-444444444444";
const PENDING = "33333333-3333-4333-8333-333333333333";
const TRIP = "trip-socket-1";

function cookieFor(token: string) {
  const payload = Buffer.from(JSON.stringify({ access_token: token, refresh_token: "hidden" })).toString(
    "base64",
  );
  return `sb-local-auth-token=base64-${payload}`;
}

describe("chat socket rooms", () => {
  const closers: Array<() => Promise<void>> = [];

  afterEach(async () => {
    await Promise.all(closers.splice(0).map((close) => close()));
  });

  it("allows active members and rejects pending join", async () => {
    const store = new MemoryChatStore();
    store.seedTrip({ tripId: TRIP, hostUserId: HOST, participants: [MEMBER], pending: [PENDING] });
    const chat = new ChatService(store);
    const auth = new AuthService(new MockAuthAdapter(), new MemoryUserRepository());
    const httpServer = createServer();
    const sockets = createSocketServer(httpServer, auth, chat);
    httpServer.on(
      "request",
      createApp(
        auth,
        sockets.disconnectUser,
        createMemorySearchService(),
        createJobService(),
        createMemoryTripService(),
        chat,
      ),
    );
    await new Promise<void>((resolve) => httpServer.listen(0, resolve));
    const address = httpServer.address();
    if (!address || typeof address === "string") throw new Error("no port");
    const url = `http://127.0.0.1:${address.port}`;

    const member = await connectClient(url, cookieFor("mock-verified-complete"));
    const joined = await new Promise<{ ok: boolean }>((resolve) => {
      member.emit("room.join", { tripId: TRIP }, resolve);
    });
    expect(joined.ok).toBe(true);

    const pending = await connectClient(url, cookieFor("mock-incomplete-profile"));
    const denied = await new Promise<{ ok: boolean; code?: string }>((resolve) => {
      pending.emit("room.join", { tripId: TRIP }, resolve);
    });
    expect(denied.ok).toBe(false);
    expect(denied.code).toBe("PENDING_MEMBER");

    closers.push(async () => {
      member.close();
      pending.close();
      sockets.io.close();
      await new Promise<void>((resolve, reject) =>
        httpServer.close((error) => (error ? reject(error) : resolve())),
      );
    });
  });
});

function connectClient(url: string, cookie: string): Promise<ClientSocket> {
  return new Promise((resolve, reject) => {
    const client = ioc(url, {
      extraHeaders: cookie ? { cookie } : {},
      transports: ["websocket"],
      forceNew: true,
    });
    client.on("connect", () => resolve(client));
    client.on("connect_error", (error) => {
      client.close();
      reject(error);
    });
  });
}
