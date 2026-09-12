import type { PublicUser } from "./kickoff.js";
import type { PlaceSummary } from "./place.ts";
import type { TripStatus, TripVisibility } from "./enums.ts";

export type MyTripRole = "hosted" | "joined" | "pending";

export type MyTripSummary = {
  id: string;
  title: string;
  visibility: TripVisibility;
  status: TripStatus;
  startDate: string;
  endDate: string;
  host: PublicUser;
  destinationCity: string;
  activeParticipantCount: number;
  maxParticipants: number | null;
};

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
