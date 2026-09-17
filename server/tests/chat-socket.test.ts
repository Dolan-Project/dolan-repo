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
  return `dolan_session=${token}`;
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

    const sent = await new Promise<{ ok: boolean; message?: { id: string } }>((resolve) => {
      member.emit(
        "message.send",
        { tripId: TRIP, clientMessageId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", body: "hi" },
        resolve,
      );
    });
    expect(sent.ok).toBe(true);
    const read = await new Promise<{ ok: boolean }>((resolve) => {
      member.emit("message.read", { tripId: TRIP, lastReadMessageId: sent.message?.id }, resolve);
    });
    expect(read.ok).toBe(true);

    closers.push(async () => {
      member.close();
      pending.close();
      sockets.io.close();
      await new Promise<void>((resolve, reject) =>
        httpServer.close((error) => (error ? reject(error) : resolve())),
      );
    });
  });

  it("stops delivering room events after a member is evicted", async () => {
    const store = new MemoryChatStore();
    store.seedTrip({ tripId: TRIP, hostUserId: HOST, participants: [MEMBER] });
    const chat = new ChatService(store);
    const auth = new AuthService(new MockAuthAdapter(), new MemoryUserRepository());
    const httpServer = createServer();
    const sockets = createSocketServer(httpServer, auth, chat);
    await new Promise<void>((resolve) => httpServer.listen(0, resolve));
    const address = httpServer.address();
    if (!address || typeof address === "string") throw new Error("no port");
    const url = `http://127.0.0.1:${address.port}`;

    const member = await connectClient(url, cookieFor("mock-admin"));
    const joined = await new Promise<{ ok: boolean }>((resolve) => {
      member.emit("room.join", { tripId: TRIP }, resolve);
    });
    expect(joined.ok).toBe(true);
    const received: unknown[] = [];
    member.on("message.created", (payload) => received.push(payload));

    await chat.evictFromRoom(TRIP, MEMBER);
    await chat.sendMessage(TRIP, HOST, {
      clientMessageId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      body: "setelah keluar",
    });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(received).toHaveLength(0);

    closers.push(async () => {
      member.close();
      sockets.io.close();
      await new Promise<void>((resolve, reject) =>
        httpServer.close((error) => (error ? reject(error) : resolve())),
      );
    });
  });

  it("fans comment.created to viewers who joined the comments room", async () => {
    const chat = new ChatService(new MemoryChatStore());
    const trips = createMemoryTripService(undefined, chat);
    const auth = new AuthService(new MockAuthAdapter(), new MemoryUserRepository());
    const httpServer = createServer();
    const sockets = createSocketServer(httpServer, auth, chat, trips);
    const app = createApp(
      auth,
      sockets.disconnectUser,
      createMemorySearchService(),
      createJobService(),
      trips,
      chat,
    );
    httpServer.on("request", app);
    await new Promise<void>((resolve) => httpServer.listen(0, resolve));
    const address = httpServer.address();
    if (!address || typeof address === "string") throw new Error("no port");
    const url = `http://127.0.0.1:${address.port}`;

    const { default: request } = await import("supertest");
    const created = await request(app)
      .post("/api/v1/trips")
      .set("Authorization", "Bearer mock-verified-complete")
      .set("Idempotency-Key", "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")
      .send({
        title: "Open Yogya",
        visibility: "PUBLIC",
        startDate: "2026-10-01",
        endDate: "2026-10-03",
        destinationCity: "Yogyakarta",
        maxParticipants: 4,
        publicMeetingPointLabel: "Stasiun Tugu",
      });
    expect(created.status).toBe(201);
    const published = await request(app)
      .post(`/api/v1/trips/${created.body.data.id}/publish`)
      .set("Authorization", "Bearer mock-verified-complete")
      .set("Idempotency-Key", "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb")
      .send({ visibility: "PUBLIC" });
    expect(published.status).toBe(200);
    const tripId = published.body.data.id as string;

    const host = await connectClient(url, cookieFor("mock-verified-complete"));
    const visitor = await connectClient(url, cookieFor("mock-verified-budi"));
    const hostJoined = await new Promise<{ ok: boolean }>((resolve) => {
      host.emit("comments.join", { tripId }, resolve);
    });
    const visitorJoined = await new Promise<{ ok: boolean }>((resolve) => {
      visitor.emit("comments.join", { tripId }, resolve);
    });
    expect(hostJoined.ok).toBe(true);
    expect(visitorJoined.ok).toBe(true);

    const incoming = new Promise<{ body: string }>((resolve) => {
      host.on("comment.created", (payload: { body: string }) => resolve(payload));
    });
    const posted = await request(app)
      .post(`/api/v1/trips/${tripId}/comments`)
      .set("Authorization", "Bearer mock-verified-budi")
      .set("Idempotency-Key", "cccccccc-cccc-4ccc-8ccc-cccccccccccc")
      .send({ body: "Boleh join?" });
    expect(posted.status).toBe(201);
    await expect(incoming).resolves.toMatchObject({ body: "Boleh join?" });

    closers.push(async () => {
      host.close();
      visitor.close();
      sockets.io.close();
      await new Promise<void>((resolve, reject) =>
        httpServer.close((error) => (error ? reject(error) : resolve())),
      );
    });
  });

  it("fans join request and review events to the trip page", async () => {
    const chat = new ChatService(new MemoryChatStore());
    const trips = createMemoryTripService(undefined, chat);
    const auth = new AuthService(new MockAuthAdapter(), new MemoryUserRepository());
    const httpServer = createServer();
    const sockets = createSocketServer(httpServer, auth, chat, trips);
    const app = createApp(
      auth,
      sockets.disconnectUser,
      createMemorySearchService(),
      createJobService(),
      trips,
      chat,
    );
    httpServer.on("request", app);
    await new Promise<void>((resolve) => httpServer.listen(0, resolve));
    const address = httpServer.address();
    if (!address || typeof address === "string") throw new Error("no port");
    const url = `http://127.0.0.1:${address.port}`;

    const { default: request } = await import("supertest");
    const created = await request(app)
      .post("/api/v1/trips")
      .set("Authorization", "Bearer mock-verified-complete")
      .set("Idempotency-Key", "dddddddd-dddd-4ddd-8ddd-dddddddddddd")
      .send({
        title: "Open Bandung",
        visibility: "PUBLIC",
        startDate: "2026-10-01",
        endDate: "2026-10-03",
        destinationCity: "Bandung",
        maxParticipants: 4,
        publicMeetingPointLabel: "Taman Sejarah",
      });
    expect(created.status).toBe(201);
    const published = await request(app)
      .post(`/api/v1/trips/${created.body.data.id}/publish`)
      .set("Authorization", "Bearer mock-verified-complete")
      .set("Idempotency-Key", "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee")
      .send({ visibility: "PUBLIC" });
    expect(published.status).toBe(200);
    const tripId = published.body.data.id as string;

    const host = await connectClient(url, cookieFor("mock-verified-complete"));
    const applicant = await connectClient(url, cookieFor("mock-verified-budi"));
    const hostJoined = await new Promise<{ ok: boolean }>((resolve) => {
      host.emit("comments.join", { tripId }, resolve);
    });
    const applicantJoined = await new Promise<{ ok: boolean }>((resolve) => {
      applicant.emit("comments.join", { tripId }, resolve);
    });
    expect(hostJoined.ok).toBe(true);
    expect(applicantJoined.ok).toBe(true);

    const createdEvent = new Promise<{ tripId: string }>((resolve) => {
      host.on("join_request.created", (payload: { tripId: string }) => resolve(payload));
    });
    const hostInbox = new Promise<{ title: string; tripId: string | null }>((resolve) => {
      host.on("notification.created", (payload: { title: string; tripId: string | null }) => resolve(payload));
    });
    const joined = await request(app)
      .post(`/api/v1/trips/${tripId}/join-requests`)
      .set("Authorization", "Bearer mock-verified-budi")
      .set("Idempotency-Key", "ffffffff-ffff-4fff-8fff-ffffffffffff")
      .send({ message: "Boleh ikut?" });
    expect(joined.status).toBe(201);
    await expect(createdEvent).resolves.toMatchObject({ tripId });
    await expect(hostInbox).resolves.toMatchObject({
      title: "Pengajuan join trip",
      tripId,
    });

    const reviewedEvent = new Promise<{ tripId: string; decision?: string }>((resolve) => {
      applicant.on("join_request.reviewed", (payload: { tripId: string; decision?: string }) => resolve(payload));
    });
    const applicantInbox = new Promise<{ title: string }>((resolve) => {
      applicant.on("notification.created", (payload: { title: string }) => resolve(payload));
    });
    const reviewed = await request(app)
      .post(`/api/v1/join-requests/${joined.body.data.id}/review`)
      .set("Authorization", "Bearer mock-verified-complete")
      .set("Idempotency-Key", "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa11")
      .send({ decision: "accept" });
    expect(reviewed.status).toBe(200);
    await expect(reviewedEvent).resolves.toMatchObject({ tripId, decision: "accept" });
    await expect(applicantInbox).resolves.toMatchObject({ title: "Pengajuan diterima" });

    closers.push(async () => {
      host.close();
      applicant.close();
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
