import type { TemplateSource } from "./enums.ts";
import type { PlaceSummary } from "./place.ts";
import type { TripSummary } from "./trip.ts";

export type TemplateSourceLabel = "Kurasi Dolan" | "Dari traveler Dolan";
export type TemplatePopularityLabel = "Populer di Dolan";

export type ItineraryTemplateSummary = {
  id: string;
  title: string;
  city: string;
  durationDays: number;
  source: TemplateSource;
  sourceLabel: TemplateSourceLabel;
  usageCount: number;
  popularityLabel: TemplatePopularityLabel | null;
  coverPlace: PlaceSummary | null;
};

export type TemplateStopSummary = {
  sequence: number;
  activityType: string;
  customTitle: string | null;
  durationMinutes: number;
  notes: string | null;
  place: PlaceSummary | null;
};

export type TemplateDaySummary = {
  id: string;
  dayNumber: number;
  title: string | null;
  stops: TemplateStopSummary[];
};

export type ItineraryTemplateDetail = ItineraryTemplateSummary & {
  description: string | null;
  transportMode: string | null;
  days: TemplateDaySummary[];
};

export type UseTemplateResult = {
  tripId: string;
  itineraryVersionId: string;
  trip: TripSummary;
};
