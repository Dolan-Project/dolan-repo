import { describe, expect, it } from "vitest";
import type { MyTripSummary } from "./trip.js";
import type { PublicUser } from "./kickoff.js";

const host: PublicUser = {
  id: "h1",
  username: "host",
  displayName: "Host",
  avatarUrl: null,
  coverUrl: null,
  bio: null,
  domicile: "Bandung",
  followersCount: 0,
  followingCount: 0,
  hostTripCount: 1,
  participantTripCount: 0,
  rating: {
    overall: null,
    communication: null,
    attitude: null,
    reviewCount: 0,
  },
};

describe("MyTripSummary", () => {
  it("can be constructed without payment fields", () => {
    const trip: MyTripSummary = {
      id: "t1",
      title: "Bali 3H2M",
      visibility: "PUBLIC",
      status: "OPEN",
      startDate: "2026-10-01",
      endDate: "2026-10-03",
      host,
      destinationCity: "Bali",
      activeParticipantCount: 2,
      maxParticipants: 4,
    };
    expect("joinFee" in trip).toBe(false);
    expect(trip.maxParticipants).toBe(4);
  });
});
