import { describe, expect, it } from "vitest";
import {
  coverMatchesDestination,
  hasCoverPhoto,
  pickPhotographedCover,
  toDestinationCover,
} from "./destination-cover";
import type { PlaceSummary } from "@dolan/shared";

function place(overrides: Partial<PlaceSummary> & Pick<PlaceSummary, "googlePlaceId" | "name">): PlaceSummary {
  return {
    formattedAddress: null,
    city: null,
    latitude: 0,
    longitude: 0,
    rating: null,
    userRatingCount: null,
    photoName: null,
    photoUri: null,
    googleMapsUrl: null,
    ...overrides,
  };
}

describe("destination cover", () => {
  it("only treats a place as photographed when Google sent a photo", () => {
    expect(hasCoverPhoto({ photoName: null, photoUri: null })).toBe(false);
    expect(hasCoverPhoto(toDestinationCover({
      googlePlaceId: "ChIJ-bandung",
      name: "Gedung Sate",
      photoName: "places/ChIJ-bandung/photos/1",
    }))).toBe(true);
  });

  it("picks a Google photo that matches the destination city", () => {
    const bogor = place({
      googlePlaceId: "ChIJ-bogor",
      name: "Kebun Raya Bogor",
      city: "Bogor",
      photoName: "places/ChIJ-bogor/photos/1",
    });
    const jakarta = place({
      googlePlaceId: "ChIJ-jakarta",
      name: "Monas",
      city: "Jakarta",
      photoName: "places/ChIJ-jakarta/photos/1",
    });
    const noPhoto = place({
      googlePlaceId: "ChIJ-empty",
      name: "Bogor",
      city: "Bogor",
    });
    expect(pickPhotographedCover([noPhoto, jakarta, bogor], "Bogor")?.googlePlaceId).toBe("ChIJ-bogor");
    expect(coverMatchesDestination(bogor, "Bogor")).toBe(true);
    expect(coverMatchesDestination(jakarta, "Bogor")).toBe(false);
  });
});
