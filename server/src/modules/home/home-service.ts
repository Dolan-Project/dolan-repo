import { apiSuccess, type HomeComposerOptions, type HomeStreamItem, type ItineraryTemplateSummary, type SessionActor } from "@dolan/shared";
import type { ChatService } from "../chat/chat-service.ts";
import type { PostService } from "../posts/post-service.ts";
import type { ProvinceService } from "../provinces/province-service.ts";
import type { SearchService } from "../search/search-service.ts";
import type { TripService } from "../trips/trip-service.ts";
import { isProfileComplete } from "../auth/authorization.ts";

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

export class HomeFeedService {
  constructor(
    private readonly search: SearchService,
    private readonly provinces: ProvinceService,
    private readonly trips: TripService,
    private readonly chat: ChatService,
    private readonly posts?: PostService,
  ) {}

  async build(actor: SessionActor): Promise<HomeFeedPayload> {
    const [tripPage, templatePage, provinces] = await Promise.all([
      this.search.searchTrips({ sort: "soonest", page: 1, limit: 6 }),
      this.search.searchTemplates({ sort: "popular", page: 1, limit: 8 }),
      this.provinces.list(""),
    ]);

    let draftTrips: HomeFeedPayload["tasks"]["draftTrips"] = [];
    let unreadNotifications = 0;
    let profileComplete = false;
    let domicile: string | null = null;

    if (actor.kind === "user") {
      profileComplete = isProfileComplete(actor.user);
      domicile = actor.user.domicile;
      const [hosted, notifications] = await Promise.all([
        this.trips.listMine(actor, "hosted", 1, 20),
        this.chat.listNotifications(actor.user.id, 1, 50),
      ]);
      draftTrips = hosted.data
        .filter((trip) => trip.status === "DRAFT")
        .slice(0, 5)
        .map((trip) => ({
          id: trip.id,
          title: trip.title,
          destinationCity: trip.destinationCity,
        }));
      unreadNotifications =
        notifications.unreadCount ?? notifications.items.filter((item) => !item.readAt).length;
    }

    const templates = templatePage.data.map((template) => ({
      id: template.id,
      title: template.title,
      city: template.city,
      durationDays: template.durationDays,
      source: template.source,
      sourceLabel: template.sourceLabel,
      usageCount: template.usageCount,
      popularityLabel: template.popularityLabel,
      coverPlace: template.coverPlace,
    }));

    const stream = this.posts ? await this.posts.homeStream(actor, templates) : [];
    const composer = actor.kind === "user" && this.posts
      ? await this.posts.composerOptions(actor)
      : { trips: [], templates };

    return {
      trips: tripPage.data.map((trip) => ({
        id: trip.id,
        title: trip.title,
        destinationCity: trip.destinationCity,
        startDate: trip.startDate,
        endDate: trip.endDate,
        participantCount: trip.participantCount,
        pendingRequestCount: trip.pendingRequestCount,
        publicMeetingPointLabel: trip.publicMeetingPointLabel,
        status: trip.status,
      })),
      templates,
      provinces: provinces
        .slice()
        .sort((a, b) => a.featuredRank - b.featuredRank)
        .slice(0, 12)
        .map((province) => ({
          id: province.id,
          slug: province.slug,
          name: province.name,
          capital: province.capital,
          description: province.description,
          featuredRank: province.featuredRank,
        })),
      tasks: {
        draftTrips,
        unreadNotifications,
        profileComplete,
        domicile,
      },
      stream,
      composer,
    };
  }
}

export function homeFeedSuccess(payload: HomeFeedPayload) {
  return apiSuccess(payload);
}
