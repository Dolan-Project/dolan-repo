import { describe, expect, it } from "vitest";
import { fallbackTripCover } from "./load-guest-home";
import type { TripSummary } from "@dolan/shared";

function trip(overrides: Partial<TripSummary>): TripSummary {
  return {
    id: "t1",
    title: "Trip Bandung",
    destinationCity: "Bandung",
    visibility: "PUBLIC",
    status: "OPEN",
    startDate: "2026-10-01",
    endDate: "2026-10-03",
    participantCount: 2,
    pendingRequestCount: 0,
    coverPlace: null,
    publicMeetingPointLabel: null,
    publicMeetingPointLatitude: null,
    publicMeetingPointLongitude: null,
    ...overrides,
  };
}

describe("guest home trip covers", () => {
  it("uses the province photo that matches the trip destination", () => {
    expect(fallbackTripCover(trip({ destinationCity: "Bandung" }))).toMatch(/kawah|bandung|wikimedia/i);
    expect(fallbackTripCover(trip({ destinationCity: "Bali", title: "Sunset Ubud" }))).toMatch(/tanah|bali|wikimedia/i);
  });

  it("falls back to the cover place city when the trip city is empty", () => {
    const cover = fallbackTripCover(trip({
      destinationCity: null,
      title: "Jelajah Bromo",
      coverPlace: {
        googlePlaceId: "ChIJ-bromo",
        name: "Gunung Bromo",
        formattedAddress: null,
        city: "Probolinggo",
        latitude: -7.94,
        longitude: 112.95,
        rating: null,
        userRatingCount: null,
        photoName: null,
        photoUri: null,
        googleMapsUrl: null,
      },
    }));
    expect(cover).toMatch(/bromo|wikimedia|probolinggo|jawa/i);
  });
});
