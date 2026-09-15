import type { HomeComposerOptions, HomeStreamItem, ItineraryTemplateSummary } from "@dolan/shared";

export type HomeFeedPayload = {
  trips: Array<{
    id: string;
    title: string;
    destinationCity: string | null;
    startDate: string | null;
    endDate: string | null;
    participantCount: number;
    pendingRequestCount: number;
    publicMeetingPointLabel: string | null;
    status: string;
  }>;
  templates: ItineraryTemplateSummary[];
  provinces: Array<{
    id: string;
    slug: string;
    name: string;
    capital: string;
    description: string;
    featuredRank: number;
  }>;
  tasks: {
    draftTrips: Array<{ id: string; title: string; destinationCity: string | null }>;
    unreadNotifications: number;
    profileComplete: boolean;
    domicile: string | null;
  };
  stream: HomeStreamItem[];
  composer: HomeComposerOptions;
};
