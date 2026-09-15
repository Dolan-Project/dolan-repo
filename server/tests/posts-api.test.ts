import request from "supertest";
import { describe, expect, it } from "vitest";
import { MEMORY_TEMPLATE_ID } from "../src/modules/search/memory-store.ts";
import { createApp } from "../src/app.ts";
import { createJobService, createMemorySearchService } from "../src/container.ts";
import { MockAuthAdapter } from "../src/modules/auth/mock-auth-adapter.ts";
import { AuthService } from "../src/modules/auth/auth-service.ts";
import { MemoryUserRepository } from "../src/modules/auth/user-repository.ts";
import { MemoryTripStore } from "../src/modules/trips/memory-store.ts";
import { TripService } from "../src/modules/trips/trip-service.ts";
import { idempotencyKey as k } from "./idempotency-key.ts";

const HOST = "Bearer mock-verified-complete";
const BUDDI = "Bearer mock-verified-budi";
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

function app() {
  return createApp(
    new AuthService(new MockAuthAdapter(), new MemoryUserRepository()),
    () => 0,
    createMemorySearchService(),
    createJobService(),
    new TripService(new MemoryTripStore()),
  );
}

describe("home moments feed", () => {
  it("creates a post, likes once, comments, and hides blocked authors", async () => {
    const api = app();
    const created = await request(api)
      .post("/api/v1/posts")
      .set("Authorization", HOST)
      .attach("file", PNG, { filename: "toba.png", contentType: "image/png" })
      .field("caption", "Senja di Toba")
      .field("templateId", MEMORY_TEMPLATE_ID);
    expect(created.status).toBe(201);
    expect(created.body.data.caption).toBe("Senja di Toba");
    expect(created.body.data.template.id).toBe(MEMORY_TEMPLATE_ID);
    const postId = created.body.data.id as string;

    const firstLike = await request(api).post(`/api/v1/posts/${postId}/likes`).set("Authorization", BUDDI);
    const secondLike = await request(api).post(`/api/v1/posts/${postId}/likes`).set("Authorization", BUDDI);
    expect(firstLike.status).toBe(200);
    expect(secondLike.body.data.likeCount).toBe(1);
    expect(secondLike.body.data.likedByMe).toBe(true);

    const comment = await request(api)
      .post(`/api/v1/posts/${postId}/comments`)
      .set("Authorization", BUDDI)
      .send({ body: "Keren banget" });
    expect(comment.status).toBe(201);

    const inbox = await request(api).get("/api/v1/notifications").set("Authorization", HOST);
    expect(inbox.status).toBe(200);
    const types = (inbox.body.data as Array<{ type: string }>).map((row) => row.type);
    expect(types).toContain("post.liked");
    expect(types).toContain("post.commented");

    const feed = await request(api).get("/api/v1/home/feed").set("Authorization", HOST);
    expect(feed.status).toBe(200);
    expect(Array.isArray(feed.body.data.stream)).toBe(true);
    expect(feed.body.data.stream.some((item: { kind: string }) => item.kind === "post")).toBe(true);
    expect(feed.body.data.templates.length).toBeGreaterThan(0);

    await request(api).post("/api/v1/users/alya/block").set("Authorization", BUDDI);
    const hidden = await request(api).get("/api/v1/posts").set("Authorization", BUDDI);
    expect(hidden.body.data.find((row: { id: string }) => row.id === postId)).toBeUndefined();
  });

  it("rejects an invalid template and a trip the author did not join", async () => {
    const api = app();
    const badTemplate = await request(api)
      .post("/api/v1/posts")
      .set("Authorization", HOST)
      .attach("file", PNG, { filename: "toba.png", contentType: "image/png" })
      .field("templateId", "99999999-9999-4999-8999-999999999999");
    expect(badTemplate.status).toBe(400);

    const trip = await request(api)
      .post("/api/v1/trips")
      .set("Authorization", HOST)
      .set("Idempotency-Key", k("host-trip"))
      .send({ title: "Trip Alya" });
    const foreign = await request(api)
      .post("/api/v1/posts")
      .set("Authorization", BUDDI)
      .attach("file", PNG, { filename: "toba.png", contentType: "image/png" })
      .field("tripId", trip.body.data.id);
    expect([403, 404]).toContain(foreign.status);
  });
});
