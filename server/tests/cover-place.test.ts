import { describe, expect, it } from "vitest";
import { coverPlaceFromPreferences, hasCoverPhoto } from "../src/modules/trips/cover-place.ts";

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
});
