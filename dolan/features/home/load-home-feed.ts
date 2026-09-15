import { cookies } from "next/headers";
import { INDONESIA_PROVINCES } from "@/lib/provinces";
import type { HomeFeedPayload } from "./home-feed-types";

export type { HomeFeedPayload } from "./home-feed-types";

export type HomeFeedResult =
  | { ok: true; data: HomeFeedPayload }
  | { ok: false; error: string; data: HomeFeedPayload };

export function emptyHomeFeed(): HomeFeedPayload {
  return {
    trips: [],
    templates: [],
    provinces: INDONESIA_PROVINCES.slice(0, 12).map((province) => ({
      id: province.slug,
      slug: province.slug,
      name: province.name,
      capital: province.capital,
      description: province.description,
      featuredRank: province.featuredRank,
    })),
    tasks: {
      draftTrips: [],
      unreadNotifications: 0,
      profileComplete: true,
      domicile: null,
    },
    stream: [],
    composer: { trips: [], templates: [] },
  };
}

export async function loadHomeFeed(): Promise<HomeFeedResult> {
  const cookie = (await cookies())
    .getAll()
    .map((item) => `${item.name}=${item.value}`)
    .join("; ");

  try {
    const origin = process.env.EXPRESS_ORIGIN?.trim() || "http://localhost:4000";
    const response = await fetch(`${origin.replace(/\/$/, "")}/api/v1/home/feed`, {
      headers: cookie ? { cookie, accept: "application/json" } : { accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) {
      return {
        ok: false,
        error: `Feed tidak tersedia (${response.status}).`,
        data: emptyHomeFeed(),
      };
    }
    const json = (await response.json()) as
      | { success: true; data: HomeFeedPayload }
      | { success: false; error?: { message?: string } };
    if (!json.success) {
      return {
        ok: false,
        error: json.error?.message ?? "Feed gagal dimuat.",
        data: emptyHomeFeed(),
      };
    }
    return {
      ok: true,
      data: {
        ...emptyHomeFeed(),
        ...json.data,
        stream: json.data.stream ?? [],
        composer: json.data.composer ?? { trips: [], templates: json.data.templates ?? [] },
        provinces:
          json.data.provinces.length > 0
            ? json.data.provinces
            : emptyHomeFeed().provinces,
      },
    };
  } catch {
    return {
      ok: false,
      error: "Tidak bisa menghubungi server feed.",
      data: emptyHomeFeed(),
    };
  }
}
