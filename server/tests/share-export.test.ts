import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.ts";
import { createJobService, createMemorySearchService } from "../src/container.ts";
import { MockAuthAdapter } from "../src/integrations/supabase/mock-auth-adapter.ts";
import { AuthService } from "../src/modules/auth/auth-service.ts";
import { MemoryUserRepository } from "../src/modules/auth/user-repository.ts";
import { ChatService } from "../src/modules/chat/chat-service.ts";
import { MemoryChatStore } from "../src/modules/chat/memory-chat-store.ts";
import { ItineraryExportService } from "../src/modules/location/itinerary-export.ts";
import { LocationService } from "../src/modules/location/location-service.ts";
import { MemoryLocationStore } from "../src/modules/location/memory-location-store.ts";
import { MemoryShareLinkStore, ShareLinkService } from "../src/modules/location/share-link-service.ts";
import { hashShareToken } from "../src/modules/location/token-hash.ts";
import { googleMapsDirUrl } from "../src/modules/location/maps-url.ts";

const HOST = "11111111-1111-4111-8111-111111111111";
const MEMBER = "44444444-4444-4444-8444-444444444444";
const PENDING = "33333333-3333-4333-8333-333333333333";
const TRIP = "trip-share-1";

function setup() {
  const chatStore = new MemoryChatStore();
  chatStore.seedTrip({ tripId: TRIP, hostUserId: HOST, participants: [MEMBER], pending: [PENDING] });
  const chat = new ChatService(chatStore);
  const shareStore = new MemoryShareLinkStore();
  const shares = new ShareLinkService(shareStore, chat, async () => ({
    title: "Jogja Weekend",
    destinationCity: "Yogyakarta",
    startDate: "2026-10-01",
    endDate: "2026-10-03",
    summary: "Candi dan kuliner",
    privateOriginLabel: "SECRET_HOME",
    email: "hidden@example.com",
    preciseLocation: { lat: -7.79, lng: 110.36 },
  }));
  const exports = new ItineraryExportService(chat, async (tripId, versionId) => ({
    tripId,
    versionId: versionId ?? "version-selected",
    title: "Jogja Weekend",
    summary: "Candi dan kuliner",
    days: [
      {
        dayNumber: 1,
        title: "Malioboro",
        stops: [
          { name: "Tugu", latitude: -7.7829, longitude: 110.3671 },
          { name: "Malioboro", latitude: -7.7926, longitude: 110.3658 },
        ],
      },
    ],
  }));
  const app = createApp(
    new AuthService(new MockAuthAdapter(), new MemoryUserRepository()),
    () => 0,
    createMemorySearchService(),
    createJobService(),
    undefined,
    chat,
    undefined,
    undefined,
    new LocationService(new MemoryLocationStore(), chat),
    shares,
    exports,
  );
  return { app, shareStore };
}

describe("share links and itinerary export", () => {
  it("returns the raw token once, stores only the hash, and strips private fields", async () => {
    const { app, shareStore } = setup();
    const created = await request(app)
      .post(`/api/v1/trips/${TRIP}/share-links`)
      .set("Authorization", "Bearer mock-verified-complete")
      .send({ permittedFields: ["title", "summary", "privateOriginLabel", "email"] });
    expect(created.status).toBe(201);
    expect(created.body.data.token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(created.body.data.tokenHash).toBeUndefined();
    expect(shareStore.links[0]?.tokenHash).toBe(hashShareToken(created.body.data.token));
    expect(JSON.stringify(shareStore.links[0])).not.toContain(created.body.data.token);

    const preview = await request(app).get(`/api/v1/share/${created.body.data.token}`);
    expect(preview.status).toBe(200);
    expect(preview.body.data.preview).toEqual({ title: "Jogja Weekend", summary: "Candi dan kuliner" });
    expect(preview.body.data.preview.privateOriginLabel).toBeUndefined();
    expect(preview.body.data.preview.email).toBeUndefined();
    expect(JSON.stringify(preview.body)).not.toContain("SECRET_HOME");
    expect(JSON.stringify(preview.body)).not.toContain(shareStore.links[0]!.tokenHash);

    const pending = await request(app)
      .post(`/api/v1/trips/${TRIP}/share-links`)
      .set("Authorization", "Bearer mock-incomplete-profile")
      .send({});
    expect(pending.status).toBe(403);

    await request(app)
      .post(`/api/v1/trips/${TRIP}/share-links/${created.body.data.id}/revoke`)
      .set("Authorization", "Bearer mock-admin");
    const after = await request(app).get(`/api/v1/share/${created.body.data.token}`);
    expect(after.status).toBe(404);
  });

  it("exports the selected itinerary as PDF and a Google Maps URL", async () => {
    const { app } = setup();
    const pdf = await request(app)
      .get(`/api/v1/trips/${TRIP}/itinerary.pdf`)
      .set("Authorization", "Bearer mock-verified-complete");
    expect(pdf.status).toBe(200);
    expect(pdf.headers["content-type"]).toContain("application/pdf");
    const pdfText = Buffer.isBuffer(pdf.body) ? pdf.body.toString("latin1") : String(pdf.body);
    expect(pdfText.startsWith("%PDF-1.4")).toBe(true);
    expect(pdfText).toContain("Jogja Weekend");

    const nav = await request(app)
      .get(`/api/v1/trips/${TRIP}/navigation?day=1`)
      .set("Authorization", "Bearer mock-admin");
    expect(nav.status).toBe(200);
    expect(nav.body.data.url).toBe(
      googleMapsDirUrl([
        { name: "Tugu", latitude: -7.7829, longitude: 110.3671 },
        { name: "Malioboro", latitude: -7.7926, longitude: 110.3658 },
      ]),
    );
    expect(nav.body.data.url).toContain("https://www.google.com/maps/dir/?api=1");

    const pendingPdf = await request(app)
      .get(`/api/v1/trips/${TRIP}/itinerary.pdf`)
      .set("Authorization", "Bearer mock-incomplete-profile");
    expect(pendingPdf.status).toBe(403);
  });
});
