import type {
  ItineraryTemplateDetail,
  ItineraryTemplateSummary,
  PlaceSummary,
  TemplateSearchQuery,
  TripSearchQuery,
  TripSummary,
  UseTemplateBody,
  UseTemplateResult,
} from "@dolan/shared";

export type UseTemplateCommand = UseTemplateBody & {
  templateId: string;
  userId: string;
  userEmail: string;
  userAuthReference: string;
  userRole: "USER" | "ADMIN";
  userStatus: "ACTIVE" | "RESTRICTED" | "SUSPENDED";
  emailVerifiedAt: string | null;
  username: string | null;
  displayName: string | null;
  domicile: string | null;
};

export type StoredIdempotency = {
  requestHash: string;
  responseStatus: number;
  responseBody: unknown;
};

export interface SearchStore {
  listKnownCities(): Promise<string[]>;
  getDestinationVisitCounts(googlePlaceIds: string[]): Promise<Map<string, number>>;
  cachePlaces(places: PlaceSummary[]): Promise<void>;
  getCachedPlace(googlePlaceId: string): Promise<PlaceSummary | null>;
  searchPublicTrips(query: TripSearchQuery): Promise<{ items: TripSummary[]; total: number }>;
  searchTemplates(query: TemplateSearchQuery): Promise<{ items: ItineraryTemplateSummary[]; total: number }>;
  getTemplate(id: string): Promise<ItineraryTemplateDetail | null>;
  listPlaceTrips(
    googlePlaceId: string,
    page: number,
    limit: number,
  ): Promise<{ items: TripSummary[]; total: number }>;
  listPlaceTemplates(
    googlePlaceId: string,
    page: number,
    limit: number,
  ): Promise<{ items: ItineraryTemplateSummary[]; total: number }>;
  useTemplate(command: UseTemplateCommand): Promise<UseTemplateResult>;
  findIdempotency(actorUserId: string, operation: string, key: string): Promise<StoredIdempotency | null>;
  saveIdempotency(
    actorUserId: string,
    operation: string,
    key: string,
    requestHash: string,
    responseStatus: number,
    responseBody: unknown,
    expiresAt: Date,
  ): Promise<void>;
}

export interface QuotaStore {
  countAndIncrement(input: {
    provider: string;
    operation: string;
    period: string;
    userId: string | null;
    limit: number;
    estimatedCost?: number;
  }): Promise<number>;
}
