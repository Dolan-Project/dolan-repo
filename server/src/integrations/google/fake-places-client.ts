import type { PlaceDetails, PlacePhotoMedia, PlaceSummary } from "@dolan/shared";
import { SearchErrorCode } from "@dolan/shared";
import { notFound } from "../../lib/api-error.ts";
import type { PlacesProvider, PlacesSearchInput } from "./places-client.ts";
import { normalizeCityName } from "../../modules/search/city-catalog.ts";
import { MEMORY_PLACE_MALIOBORO } from "../../modules/search/memory-store.ts";

const PRAMBANAN: PlaceSummary = {
  googlePlaceId: "ChIJf5UqGYeXeY4RwZVQ9n0s7oE",
  name: "Candi Prambanan",
  formattedAddress: "Prambanan, Yogyakarta",
  city: "Yogyakarta",
  latitude: -7.752,
  longitude: 110.4915,
  rating: 4.7,
  userRatingCount: 8000,
  photoName: null,
  googleMapsUrl: null,
  types: ["tourist_attraction", "hindu_temple"],
};

const HOTEL_MALIOBORO: PlaceSummary = {
  googlePlaceId: "ChIJn190ZSZYei4R8LwDHj-UrT4",
  name: "Hotel Malioboro Inn Yogyakarta",
  formattedAddress: "Jl. Sosrowijayan No.23, Yogyakarta",
  city: "Kota Yogyakarta",
  latitude: -7.7918185,
  longitude: 110.3642496,
  rating: 4.3,
  userRatingCount: 1994,
  photoName: null,
  googleMapsUrl: null,
  types: ["lodging", "hotel"],
};

export class FakePlacesClient implements PlacesProvider {
  constructor(
    private readonly places: PlaceSummary[] = [HOTEL_MALIOBORO, MEMORY_PLACE_MALIOBORO, PRAMBANAN],
    private readonly failWith?: Error,
  ) {}

  async searchText(input: PlacesSearchInput): Promise<PlaceSummary[]> {
    if (this.failWith) throw this.failWith;
    const needle = input.query.toLowerCase();
    return this.places.filter((place) => {
      const haystack = `${place.name} ${place.city ?? ""}`.toLowerCase();
      if (!haystack.includes(needle) && needle !== "wisata") return false;
      if (input.city) {
        const wanted = normalizeCityName(input.city) ?? input.city;
        const placeCity = normalizeCityName(place.city) ?? place.city;
        if (placeCity?.toLowerCase() !== wanted.toLowerCase()) return false;
      }
      return true;
    });
  }

  async getDetails(googlePlaceId: string): Promise<PlaceDetails> {
    if (this.failWith) throw this.failWith;
    const place = this.places.find((item) => item.googlePlaceId === googlePlaceId);
    if (!place) {
      throw notFound(SearchErrorCode.PLACE_NOT_FOUND, "Place was not found");
    }
    return {
      ...place,
      types: ["tourist_attraction"],
      editorialSummary: null,
      weekdayDescriptions: null,
      attributions: [{ displayName: "Google", uri: "https://maps.google.com" }],
      visitCount: 0,
    };
  }

  async getPhotoMedia(photoName: string): Promise<PlacePhotoMedia> {
    if (this.failWith) throw this.failWith;
    return {
      photoUri: `https://lh3.googleusercontent.com/demo/${encodeURIComponent(photoName)}`,
      attributions: [{ displayName: "Google", uri: null }],
    };
  }
}
