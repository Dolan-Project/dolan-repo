import type { ApiPage, TripSummary } from "@dolan/shared";
import { provinceCoverUrl, provinceHref } from "@/lib/province-cover";
import { INDONESIA_PROVINCES, type CuratedProvince } from "@/lib/provinces";

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
const FEATURED_PROVINCES = ["bali", "jawa-timur", "nusa-tenggara-timur", "di-yogyakarta"] as const;

export function featuredGuestProvinces(): GuestHomeDestination[] {
  const preferred = FEATURED_PROVINCES.map((slug) =>
    INDONESIA_PROVINCES.find((item) => item.slug === slug),
  ).filter((item): item is CuratedProvince => Boolean(item));
  const extra = INDONESIA_PROVINCES.filter((item) => !preferred.some((row) => row.slug === item.slug));
  return [...preferred, ...extra].slice(0, 4).map((province, index) => ({
    name: province.name,
    meta: `Ibu kota ${province.capital}`,
    image: provinceCoverUrl(province),
    href: provinceHref(province.slug),
    size: SIZES[index] ?? "small",
  }));
}

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

export async function loadGuestHome(): Promise<GuestHomePayload> {
  const base = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1").replace(/\/$/, "");

  const tripsPayload = await fetchJson<ApiPage<TripSummary>>(
    `${base}/search/trips?sort=soonest&page=1&limit=6`,
  );

  const destinations = featuredGuestProvinces();

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
