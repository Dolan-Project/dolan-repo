import type { PlaceSummary } from "./place.ts";
import type { TripStatus, TripVisibility } from "./enums.ts";

export type TripSummary = {
  id: string;
  title: string;
  destinationCity: string | null;
  visibility: TripVisibility;
  status: TripStatus;
  startDate: string | null;
  endDate: string | null;
  participantCount: number;
  pendingRequestCount: number;
  coverPlace: PlaceSummary | null;
};
