import type {
  PublicUser,
  TripStatus,
  TripVisibility,
} from "./kickoff.js";

export type MyTripRole = "hosted" | "joined" | "pending";

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
