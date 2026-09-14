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
  templates: Array<{
    id: string;
    title: string;
    city: string;
    durationDays: number;
    sourceLabel: string;
    usageCount: number;
    popularityLabel: string | null;
  }>;
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
};
