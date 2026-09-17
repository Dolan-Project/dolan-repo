import { describe, expect, it } from "vitest";
import { mixHomeStream } from "../src/modules/posts/mix-stream.ts";
import type { ItineraryTemplateSummary, PostCard } from "@dolan/shared";

const template = (id: string, title = id): ItineraryTemplateSummary => ({
  id,
  title,
  city: "Yogyakarta",
  durationDays: 3,
  source: "CURATED",
  sourceLabel: "Kurasi Dolan",
  usageCount: 4,
  popularityLabel: "Populer di Dolan",
  coverPlace: null,
});

const post = (id: string): PostCard => ({
  id,
  caption: id,
  imageUrl: "https://example.com/p.jpg",
  author: {
    id,
    username: "u",
    displayName: "U",
    avatarUrl: null,
    coverUrl: null,
    bio: null,
    domicile: null,
    instagramUrl: null,
    tiktokUrl: null,
    followersCount: 0,
    followingCount: 0,
    hostTripCount: 0,
    participantTripCount: 0,
    rating: { overall: null, communication: null, attitude: null, reviewCount: 0 },
  },
  trip: null,
  template: null,
  likeCount: 0,
  commentCount: 0,
  likedByMe: false,
  comments: [],
  createdAt: new Date().toISOString(),
});

describe("mixHomeStream", () => {
  it("inserts plan cards and does not leave an empty feed", () => {
    const templates = [template("t1"), template("t2"), template("t3"), template("t4")];
    expect(mixHomeStream([], templates).every((item) => item.kind === "plan")).toBe(true);

    const mixed = mixHomeStream([post("p1"), post("p2"), post("p3"), post("p4")], templates);
    expect(mixed.filter((item) => item.kind === "post")).toHaveLength(4);
    expect(mixed.some((item) => item.kind === "plan")).toBe(true);
    const ids = mixed.filter((item) => item.kind === "plan").map((item) => item.kind === "plan" && item.template.id);
    expect(ids).not.toContain("t1");

    const longer = mixHomeStream(
      [post("p1"), post("p2"), post("p3"), post("p4"), post("p5"), post("p6"), post("p7"), post("p8")],
      templates,
    );
    const planIds = longer
      .filter((item) => item.kind === "plan")
      .map((item) => (item.kind === "plan" ? item.template.id : ""));
    expect(planIds).toEqual(["t4", "t4"]);
    for (let index = 1; index < longer.length; index += 1) {
      const prev = longer[index - 1];
      const curr = longer[index];
      if (prev?.kind === "plan" && curr?.kind === "plan") {
        expect(prev.template.id).not.toBe(curr.template.id);
      }
    }
  });
});
