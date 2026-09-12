import { createServer } from "node:http";
import { io as ioc, type Socket as ClientSocket } from "socket.io-client";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.ts";
import { MockAuthAdapter } from "../src/integrations/supabase/mock-auth-adapter.ts";
import { AuthService } from "../src/modules/auth/auth-service.ts";
import { MemoryUserRepository } from "../src/modules/auth/user-repository.ts";
import { createSocketServer } from "../src/socket/index.ts";

function cookieFor(token: string) {
  const payload = Buffer.from(JSON.stringify({ access_token: token, refresh_token: "hidden" })).toString(
    "base64",
  );
  return `sb-local-auth-token=base64-${payload}`;
}

describe("socket cookie authentication", () => {
  const closers: Array<() => Promise<void>> = [];

  afterEach(async () => {
    await Promise.all(closers.splice(0).map((close) => close()));
  });

  it("accepts a handshake with a valid Supabase cookie and disconnects on logout", async () => {
    const authService = new AuthService(new MockAuthAdapter(), new MemoryUserRepository());
    const httpServer = createServer();
    const sockets = createSocketServer(httpServer, authService);
    const app = createApp(authService, sockets.disconnectUser);
    httpServer.on("request", app);

    await new Promise<void>((resolve) => httpServer.listen(0, resolve));
    const address = httpServer.address();
    if (!address || typeof address === "string") throw new Error("no port");
    const url = `http://127.0.0.1:${address.port}`;

    const client = await connectClient(url, cookieFor("mock-verified-complete"));
    expect(client.connected).toBe(true);

    const { default: request } = await import("supertest");
    const session = await request(app)
      .get("/api/v1/auth/session")
      .set("Authorization", "Bearer mock-verified-complete");
    expect(sockets.registry.hasUser(session.body.data.id)).toBe(true);

    const disconnected = new Promise<void>((resolve) => {
      client.on("disconnect", () => resolve());
    });
    const response = await request(app)
      .post("/api/v1/auth/disconnect-sockets")
      .set("Authorization", "Bearer mock-verified-complete");
    expect(response.body.data.closed).toBeGreaterThan(0);
    await disconnected;
    expect(client.connected).toBe(false);

    closers.push(async () => {
      client.close();
      sockets.io.close();
      await new Promise<void>((resolve, reject) =>
        httpServer.close((error) => (error ? reject(error) : resolve())),
      );
    });
  });

  it("rejects a handshake without a cookie", async () => {
    const authService = new AuthService(new MockAuthAdapter(), new MemoryUserRepository());
    const httpServer = createServer();
    const sockets = createSocketServer(httpServer, authService);
    httpServer.on("request", createApp(authService, sockets.disconnectUser));
    await new Promise<void>((resolve) => httpServer.listen(0, resolve));
    const address = httpServer.address();
    if (!address || typeof address === "string") throw new Error("no port");

    await expect(connectClient(`http://127.0.0.1:${address.port}`, "")).rejects.toThrow();

    closers.push(async () => {
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
