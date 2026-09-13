import { describe, expect, it } from "vitest";
import { extractCity, toPlaceSummary } from "../src/integrations/google/places-mapper.ts";
import { photoMediaPath } from "../src/integrations/google/places-client.ts";

describe("Google Places mapper", () => {
  const place = {
    id: "ChIJ123",
    displayName: { text: "Malioboro" },
    formattedAddress: "Jl. Malioboro, Yogyakarta",
    location: { latitude: -7.79, longitude: 110.36 },
    rating: 4.6,
    userRatingCount: 10,
    photos: [{ name: "places/ChIJ123/photos/abc", authorAttributions: [{ displayName: "Ana" }] }],
    googleMapsUri: "https://maps.google.com/?cid=1",
    addressComponents: [{ longText: "Yogyakarta", types: ["locality"] }],
  };

  it("maps a Google place into PlaceSummary using a narrow field mask shape", () => {
    expect(toPlaceSummary(place)).toMatchObject({
      googlePlaceId: "ChIJ123",
      name: "Malioboro",
      city: "Yogyakarta",
      photoName: "places/ChIJ123/photos/abc",
    });
  });

  it("prefers locality for city and strips Kota/Kabupaten prefixes", () => {
    expect(extractCity(place)).toBe("Yogyakarta");
    expect(
      extractCity({
        ...place,
        addressComponents: [{ longText: "Kota Yogyakarta", types: ["locality"] }],
      }),
    ).toBe("Yogyakarta");
  });

  it("builds Place Photos media URLs with /media not :media", () => {
    expect(photoMediaPath("places/ChIJ123/photos/AVo_ref-1")).toBe(
      "places/ChIJ123/photos/AVo_ref-1/media?maxHeightPx=800&skipHttpRedirect=true",
    );
  });
});
