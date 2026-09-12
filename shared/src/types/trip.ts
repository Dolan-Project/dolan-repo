import type {
  PublicUser,
  TripStatus,
  TripVisibility,
} from "./kickoff.js";

export type MyTripRole = "hosted" | "joined" | "pending";
export type TripViewerRole = "host" | "participant" | "pending" | "visitor";
export type BudgetBasis = "PER_PERSON" | "GROUP";

export type TripSummary = {
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

export type TripDetail = TripSummary & {
  description: string;
  origin: string;
  meetingPoint: string | null;
  transport: string;
  planningPartySize: number;
  budgetAmount: number;
  budgetBasis: BudgetBasis;
  activityPrefs: string[];
  lodgingPref: string;
  companionNote: string;
  viewerRole: TripViewerRole;
};
