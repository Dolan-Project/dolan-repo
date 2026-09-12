export type SearchQuery = { city: string; startDate?: string; budget?: "hemat" | "nyaman" | "premium"; filters: string[] };
export type PlaceResult = { id: string; kind: "place"; name: string; city: string; category: string; rating: number; reviewCount: number; imageUrl: string };
export type TripResult = { id: string; kind: "trip"; title: string; city: string; dateLabel: string; seatsLeft: number; imageUrl: string; popularityCount: number };
export type ItineraryTemplateResult = { id: string; kind: "template"; title: string; city: string; durationDays: number; usageCount: number; curated: boolean; imageUrl: string };
export type SearchResponse = { requestId: string; city: { name: string; province: string }; places: PlaceResult[]; publicTrips: TripResult[]; templates: ItineraryTemplateResult[] };
export interface SearchAdapter { search(query: SearchQuery, signal?: AbortSignal): Promise<SearchResponse> }
