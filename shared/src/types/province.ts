import type { ItineraryTemplateDetail } from "./template.ts";

export type ProvincePlace = {
  id: string;
  name: string;
  city: string;
  description: string;
  googlePlaceId: string | null;
  googleMapsUrl: string;
  searchQuery: string;
  rank: number;
};

export type ProvinceSummary = {
  id: string;
  slug: string;
  name: string;
  capital: string;
  description: string;
  heroQuery: string;
  featuredRank: number;
};

export type ProvinceDetail = ProvinceSummary & {
  places: ProvincePlace[];
  template: ItineraryTemplateDetail | null;
};

export type UnifiedSearchSuggestion = {
  id: string;
  type: "province" | "city";
  label: string;
  secondaryLabel: string;
  href?: string;
};
