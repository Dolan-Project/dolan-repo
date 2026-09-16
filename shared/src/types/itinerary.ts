import type { BudgetSummary } from "../schemas/budget.ts";
import type { GenerationJobStatus, ItinerarySource } from "./enums.ts";
import type { PlaceSummary } from "./place.ts";

export type EditableItineraryStop = {
  id: string;
  sequence: number;
  place: PlaceSummary | null;
  customTitle: string | null;
  activityType: string;
  startTime: string | null;
  durationMinutes: number;
  travelDurationMinutes: number | null;
  routePolyline?: string | null;
  travelDistanceMeters?: number | null;
  routeStatus?: "PENDING" | "AVAILABLE" | "UNAVAILABLE";
  routeTravelMode?: string | null;
  notes: string | null;
  isLocked: boolean;
};

export type EditableItineraryDay = {
  id: string;
  dayNumber: number;
  date: string;
  title: string | null;
  stops: EditableItineraryStop[];
};

export type EditableItineraryVersion = {
  id: string;
  tripId: string;
  versionNumber: number;
  source: ItinerarySource;
  summary: string | null;
  assumptions: string[];
  days: EditableItineraryDay[];
  budget: BudgetSummary;
  createdAt: string;
};

export type TripChecklistItem = {
  id: string;
  title: string;
  dueDate: string | null;
  isCompleted: boolean;
};

export type ItineraryEditorSnapshot = {
  tripId: string;
  tripTitle: string;
  destinationCity: string;
  startDate: string;
  endDate: string;
  activeVersionId: string;
  versions: EditableItineraryVersion[];
  checklist: TripChecklistItem[];
};

export type EditorGenerationStatus = {
  id: string;
  status: GenerationJobStatus;
  attemptCount: number;
  resultVersionId: string | null;
  errorCode: string | null;
};
