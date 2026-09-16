import { describe, expect, it } from "vitest";
import { coverPlaceFromCache, coverPlaceFromPreferences, hasCoverPhoto } from "../src/modules/trips/cover-place.ts";

describe("cover place from trip preferences", () => {
  it("reads the destination photo saved during add trip", () => {
    const place = coverPlaceFromPreferences({
      coverPlace: {
        googlePlaceId: "ChIJ-yogya",
        name: "Malioboro",
        city: "Yogyakarta",
        latitude: -7.79,
        longitude: 110.36,
        photoName: "places/ChIJ-yogya/photos/1",
      },
    });
    expect(place?.name).toBe("Malioboro");
    expect(hasCoverPhoto(place)).toBe(true);
  });

  it("ignores empty cover snapshots", () => {
    expect(coverPlaceFromPreferences({ path: "ai-route" })).toBeNull();
    expect(coverPlaceFromPreferences({ coverPlace: { name: "Tanpa id" } })).toBeNull();
  });

  it("fills defaults from a cached place row", () => {
    expect(coverPlaceFromCache(null)).toBeNull();
    expect(hasCoverPhoto(null)).toBe(false);
    const cached = coverPlaceFromCache({ googlePlaceId: "ChIJ-x" });
    expect(cached?.name).toBe("Unknown place");
    expect(cached?.latitude).toBe(0);
    const full = coverPlaceFromPreferences({
      coverPlace: {
        googlePlaceId: "  ChIJ-y  ",
        latitude: Number.NaN,
        longitude: Number.NaN,
        types: ["park", 1, "museum"],
        rating: 4.4,
        userRatingCount: 12,
        photoUri: "https://img.test/a.jpg",
        googleMapsUrl: "https://maps.test",
        formattedAddress: "Bandung",
      },
    });
    expect(full?.name).toBe("Destinasi");
    expect(full?.types).toEqual(["park", "museum"]);
    expect(hasCoverPhoto(full)).toBe(true);
  });
});
