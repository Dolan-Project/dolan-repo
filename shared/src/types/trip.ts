import type { JoinRequest } from "./join.ts";
import type { PublicUser } from "./kickoff.js";
import type { PlaceSummary } from "./place.ts";
import type { BudgetBasis, TripStatus, TripVisibility } from "./enums.ts";

export type TripViewerRole = "host" | "participant" | "pending" | "none";

export type MyTripRole = "hosted" | "joined" | "pending";

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
  publicMeetingPointLabel: string | null;
  publicMeetingPointLatitude: number | null;
  publicMeetingPointLongitude: number | null;
};

export type MyTripSummary = TripSummary & {
  host: PublicUser;
  maxParticipants: number | null;
};

export type TripDetail = {
  id: string;
  title: string;
  description: string | null;
  visibility: TripVisibility;
  status: TripStatus;
  startDate: string | null;
  endDate: string | null;
  timezone: string;
  destinationCity: string | null;
  transportMode: string | null;
  budgetAmount: string | null;
  budgetBasis: BudgetBasis;
  currency: string;
  planningPartySize: number;
  maxParticipants: number | null;
  publicMeetingPointLabel: string | null;
  publicMeetingPointLatitude: number | null;
  publicMeetingPointLongitude: number | null;
  privateOriginLabel: string | null;
  privateOriginLatitude: number | null;
  privateOriginLongitude: number | null;
  preferences: Record<string, unknown> | null;
  host: PublicUser;
  viewerRole: TripViewerRole;
  activeParticipantCount: number;
  pendingRequestCount: number;
  joinFree: true;
  currentItineraryVersionId: string | null;
  myJoinRequest: JoinRequest | null;
};
