export type PlaceSummary = {
  googlePlaceId: string;
  name: string;
  formattedAddress: string | null;
  city: string | null;
  latitude: number;
  longitude: number;
  rating: number | null;
  userRatingCount: number | null;
  photoName: string | null;
  googleMapsUrl: string | null;
  types?: string[];
  visitCount?: number;
};

export type PlaceAttribution = {
  displayName: string;
  uri: string | null;
};

export type PlaceDetails = PlaceSummary & {
  types: string[];
  editorialSummary: string | null;
  weekdayDescriptions: string[] | null;
  attributions: PlaceAttribution[];
  visitCount: number;
};

export type PlacePhotoMedia = {
  photoUri: string;
  attributions: PlaceAttribution[];
};

export type CityCandidate = {
  name: string;
  countryCode: "ID";
};
