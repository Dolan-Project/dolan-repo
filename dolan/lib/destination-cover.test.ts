import { describe, expect, it, vi } from "vitest";
import {
  coverMatchesDestination,
  fetchDestinationCover,
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
    expect(coverMatchesDestination(null, "Bogor")).toBe(false);
    expect(coverMatchesDestination(bogor, "  ")).toBe(false);
    expect(pickPhotographedCover([noPhoto], "Bogor")).toBeNull();
    expect(pickPhotographedCover([jakarta], "Surabaya")?.googlePlaceId).toBe("ChIJ-jakarta");
  });

  it("hydrates a destination cover from the search API", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: [
              {
                googlePlaceId: "ChIJ-sate",
                name: "Gedung Sate",
                city: "Bandung",
                formattedAddress: "Bandung",
                latitude: -6.9,
                longitude: 107.6,
                rating: null,
                userRatingCount: null,
                photoName: "places/ChIJ-sate/photos/1",
                photoUri: null,
                googleMapsUrl: null,
              },
            ],
          }),
          { headers: { "content-type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, data: { photoUri: "https://img.example/sate.jpg" } }), {
          headers: { "content-type": "application/json" },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    await expect(fetchDestinationCover("B")).resolves.toBeNull();
    const cover = await fetchDestinationCover("Bandung");
    expect(cover?.photoUri).toBe("https://img.example/sate.jpg");
    vi.unstubAllGlobals();
  });

  it("returns null when search fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await expect(fetchDestinationCover("Bandung")).resolves.toBeNull();
    vi.unstubAllGlobals();
  });

  it("keeps the place when photo hydration fails", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            data: [
              {
                googlePlaceId: "ChIJ-sate",
                name: "Gedung Sate",
                city: "Bandung",
                formattedAddress: "Bandung",
                latitude: -6.9,
                longitude: 107.6,
                rating: null,
                userRatingCount: null,
                photoName: "places/ChIJ-sate/photos/1",
                photoUri: null,
                googleMapsUrl: null,
              },
            ],
          }),
          { headers: { "content-type": "application/json" } },
        ),
      )
      .mockResolvedValueOnce(new Response("nope", { status: 500 }));
    vi.stubGlobal("fetch", fetchMock);
    const cover = await fetchDestinationCover("Bandung");
    expect(cover?.googlePlaceId).toBe("ChIJ-sate");
    expect(cover?.photoUri).toBeNull();
    vi.unstubAllGlobals();
  });
});
