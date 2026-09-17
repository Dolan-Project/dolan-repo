import type {
  ApiPage,
  ApiSuccess,
  ItineraryTemplateSummary,
  PlaceDetails,
  PlacePhotoMedia,
  PlaceSummary,
  TripSummary,
} from "@dolan/shared";

export type ExploreTab = "wisata" | "trip" | "template";
export type ExploreSort = "relevance" | "popular" | "nearest" | "recent" | "soonest";

export type ExplorePage = {
  items: Array<PlaceSummary | TripSummary | ItineraryTemplateSummary>;
  page: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
};

export type ExploreSearchInput = {
  tab: ExploreTab;
  query: string;
  category?: string;
  sort: ExploreSort;
  page?: number;
  dateFrom?: string;
  dateTo?: string;
  center?: { lat: number; lng: number } | null;
  signal?: AbortSignal;
};

export class DolanApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: { Accept: "application/json" },
    signal,
  });
  const payload = (await response.json().catch(() => null)) as
    | T
    | { success: false; error?: { code?: string; message?: string } }
    | null;

  const failedPayload =
    typeof payload === "object" &&
    payload !== null &&
    "success" in payload &&
    payload.success === false;
  if (!response.ok || !payload || failedPayload) {
    const failure = payload as {
      success: false;
      error?: { code?: string; message?: string };
    } | null;
    throw new DolanApiError(
      failure?.error?.message ?? "Data belum dapat dimuat. Coba lagi sebentar.",
      failure?.error?.code ?? "UNKNOWN",
      response.status,
    );
  }
  return payload as T;
}

export async function searchExplore({
  tab,
  query,
  category,
  sort,
  page = 1,
  dateFrom,
  dateTo,
  center,
  signal,
}: ExploreSearchInput): Promise<ExplorePage> {
  const params = new URLSearchParams({ page: String(page), limit: "8" });
  let path = "/search/places";

  if (tab === "wisata") {
    const searchTerm = [query.trim(), category].filter(Boolean).join(" ");
    params.set("q", searchTerm || "tempat wisata");
    params.set("sort", sort === "nearest" ? "nearest" : sort === "popular" ? "popular" : "relevance");
    if (center) {
      params.set("lat", String(center.lat));
      params.set("lng", String(center.lng));
    }
  } else if (tab === "trip") {
    path = "/search/trips";
    if (query.trim()) params.set("city", query.trim());
    const tripSort =
      sort === "popular" ? "popular" : sort === "nearest" ? "nearest" : sort === "recent" ? "recent" : "soonest";
    params.set("sort", tripSort);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (center && tripSort === "nearest") {
      params.set("lat", String(center.lat));
      params.set("lng", String(center.lng));
    }
  } else {
    path = "/templates";
    if (query.trim()) params.set("city", query.trim());
    params.set("sort", sort === "recent" ? "recent" : "popular");
  }

  const payload = await getJson<
    ApiPage<PlaceSummary | TripSummary | ItineraryTemplateSummary>
  >(`${path}?${params}`, signal);
  return {
    items: payload.data,
    page: payload.pagination.page,
    totalItems: payload.pagination.totalItems,
    totalPages: payload.pagination.totalPages,
    hasNextPage: payload.pagination.hasNextPage,
  };
}

export async function getPlaceDetails(
  googlePlaceId: string,
  signal?: AbortSignal,
) {
  const id = encodeURIComponent(googlePlaceId);
  const place = await getJson<ApiSuccess<PlaceDetails>>(`/places/${id}`, signal);
  const [trips, templates] = await Promise.allSettled([
    getJson<ApiPage<TripSummary>>(`/places/${id}/trips?page=1&limit=6`, signal),
    getJson<ApiPage<ItineraryTemplateSummary>>(
      `/places/${id}/templates?page=1&limit=6`,
      signal,
    ),
  ]);
  return {
    place: place.data,
    trips: trips.status === "fulfilled" ? trips.value.data : [],
    templates: templates.status === "fulfilled" ? templates.value.data : [],
    relatedUnavailable: trips.status === "rejected" || templates.status === "rejected",
  };
}

const photoCache = new Map<string, Promise<PlacePhotoMedia>>();

export function getPlacePhoto(
  googlePlaceId: string,
  photoName: string,
): Promise<PlacePhotoMedia> {
  const key = `${googlePlaceId}:${photoName}`;
  const cached = photoCache.get(key);
  if (cached) return cached;
  const request = getJson<ApiSuccess<PlacePhotoMedia>>(
    `/places/${encodeURIComponent(googlePlaceId)}/photo?name=${encodeURIComponent(photoName)}`,
  ).then((payload) => payload.data);
  photoCache.set(key, request);
  request.catch(() => photoCache.delete(key));
  return request;
}
