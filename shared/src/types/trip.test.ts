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
  instagramUrl: null,
  tiktokUrl: null,
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
      destinationCity: "Bali",
      visibility: "PUBLIC",
      status: "OPEN",
      startDate: "2026-10-01",
      endDate: "2026-10-03",
      participantCount: 2,
      pendingRequestCount: 0,
      coverPlace: null,
      publicMeetingPointLabel: "Tugu Yogyakarta",
      publicMeetingPointLatitude: -7.7828,
      publicMeetingPointLongitude: 110.3671,
      host,
      maxParticipants: 4,
    };
    expect("joinFee" in trip).toBe(false);
    expect(trip.maxParticipants).toBe(4);
    expect(trip.participantCount).toBe(2);
  });
});
