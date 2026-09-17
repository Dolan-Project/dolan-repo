import type { JoinRequestStatus, PublicUser } from "./kickoff.js";

export type JoinReviewDecision = "accept" | "reject";

export type JoinRequest = {
  id: string;
  tripId: string;
  applicant: PublicUser;
  message: string | null;
  status: JoinRequestStatus;
};
