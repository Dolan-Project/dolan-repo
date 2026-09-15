import type { ApiPage, TripSummary } from "@dolan/shared";
import { ROUTES } from "@/lib/routes";

export type GuestHomeDestination = {
  name: string;
  meta: string;
  image: string | null;
  href: string;
  size: "large" | "tall" | "small";
};

export type GuestHomeTrip = {
  id: string;
  title: string;
  place: string;
  date: string;
  seats: number;
  image: string | null;
};

export type GuestHomePayload = {
  destinations: GuestHomeDestination[];
  trips: GuestHomeTrip[];
  loadError: string | null;
};

const SIZES: GuestHomeDestination["size"][] = ["large", "tall", "small", "small"];
const FEATURED_PROVINCES = ["bali", "jawa-timur", "nusa-tenggara-timur", "di-yogyakarta"];

function formatRange(start: string | null, end: string | null) {
  if (!start) return "Tanggal fleksibel";
  const format = (value: string) =>
    new Date(`${value}T00:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  const startLabel = format(start);
  if (!end || end === start) return startLabel;
  return `${startLabel} – ${format(end)}`;
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function placeHref(place: { googlePlaceId?: string | null }, provinceSlug: string) {
  if (place.googlePlaceId) return `/wisata/${encodeURIComponent(place.googlePlaceId)}`;
  return ROUTES.province(provinceSlug);
}

export async function loadGuestHome(): Promise<GuestHomePayload> {
  const base = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1").replace(/\/$/, "");

  const tripsPayload = await fetchJson<ApiPage<TripSummary>>(
    `${base}/search/trips?sort=soonest&page=1&limit=6`,
  );

  const provinceDetails = await Promise.all(
    FEATURED_PROVINCES.map(async (slug) => {
      const payload = await fetchJson<{
        success: true;
        data: {
          slug: string;
          name: string;
          places: Array<{
            name: string;
            city: string;
            googlePlaceId: string | null;
          }>;
        };
      }>(`${base}/provinces/${slug}`);
      return payload?.success ? payload.data : null;
    }),
  );

  const destinations: GuestHomeDestination[] = [];
  for (const province of provinceDetails) {
    if (!province) continue;
    const place = province.places[0];
    if (!place) continue;
    destinations.push({
      name: place.name,
      meta: `${province.name} · ${place.city}`,
      image: null,
      href: placeHref(place, province.slug),
      size: SIZES[destinations.length % SIZES.length] ?? "small",
    });
    if (destinations.length >= 4) break;
  }

  const trips: GuestHomeTrip[] = (tripsPayload?.data ?? []).map((trip) => ({
    id: trip.id,
    title: trip.title,
    place: trip.destinationCity ?? "Indonesia",
    date: formatRange(trip.startDate, trip.endDate),
    seats: Math.max(0, 7 - trip.participantCount),
    image: trip.coverPlace?.photoUri ?? null,
  }));

  return { destinations, trips, loadError: null };
}

export function isLiveGuestHome() {
  return process.env.NEXT_PUBLIC_USE_MOCK_API !== "true";
}
