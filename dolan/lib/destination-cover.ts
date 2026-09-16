import type { PlaceSummary } from "@dolan/shared";

export function hasCoverPhoto(place?: { photoName?: string | null; photoUri?: string | null } | null) {
  return Boolean(place?.photoUri || place?.photoName);
}

export function coverMatchesDestination(
  place: { name?: string | null; city?: string | null; formattedAddress?: string | null } | null | undefined,
  destination: string,
) {
  const needle = destination.trim().toLocaleLowerCase("id-ID");
  if (!needle || !place) return false;
  const city = (place.city ?? "").trim().toLocaleLowerCase("id-ID");
  const name = (place.name ?? "").trim().toLocaleLowerCase("id-ID");
  const address = (place.formattedAddress ?? "").trim().toLocaleLowerCase("id-ID");
  if (city === needle || name === needle) return true;
  if (city.includes(needle) || (city.length >= 3 && needle.includes(city))) return true;
  return name.includes(needle) || address.includes(needle);
}

export function pickPhotographedCover(places: PlaceSummary[], destination: string): PlaceSummary | null {
  const photographed = places.filter((place) => hasCoverPhoto(place));
  if (!photographed.length) return null;
  return photographed.find((place) => coverMatchesDestination(place, destination)) ?? photographed[0] ?? null;
}

export function toDestinationCover(place: {
  googlePlaceId: string;
  name: string;
  city?: string | null;
  latitude?: number;
  longitude?: number;
  formattedAddress?: string | null;
  photoName?: string | null;
  photoUri?: string | null;
}): PlaceSummary {
  return {
    googlePlaceId: place.googlePlaceId,
    name: place.name,
    formattedAddress: place.formattedAddress ?? null,
    city: place.city ?? null,
    latitude: place.latitude ?? 0,
    longitude: place.longitude ?? 0,
    rating: null,
    userRatingCount: null,
    photoName: place.photoName ?? null,
    photoUri: place.photoUri ?? null,
    googleMapsUrl: null,
  };
}

function placesApiBase() {
  return (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1").replace(/\/$/, "");
}

async function hydrateCoverPhoto(place: PlaceSummary, signal?: AbortSignal): Promise<PlaceSummary> {
  if (place.photoUri || !place.photoName) return place;
  try {
    const response = await fetch(
      `${placesApiBase()}/places/${encodeURIComponent(place.googlePlaceId)}/photo?name=${encodeURIComponent(place.photoName)}`,
      { signal, credentials: "include", headers: { Accept: "application/json" } },
    );
    if (!response.ok) return place;
    const payload = (await response.json()) as { success?: boolean; data?: { photoUri?: string } };
    const photoUri = payload.data?.photoUri;
    return photoUri ? { ...place, photoUri } : place;
  } catch {
    return place;
  }
}

export async function fetchDestinationCover(query: string, signal?: AbortSignal): Promise<PlaceSummary | null> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return null;
  const params = new URLSearchParams({ q: trimmed, city: trimmed, page: "1", limit: "10" });
  try {
    const response = await fetch(`${placesApiBase()}/search/places?${params}`, {
      signal,
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { success?: boolean; data?: PlaceSummary[] };
    if (!payload.success || !Array.isArray(payload.data) || !payload.data.length) return null;
    const picked = pickPhotographedCover(payload.data, trimmed);
    if (!picked) return null;
    return hydrateCoverPhoto(picked, signal);
  } catch {
    return null;
  }
}
