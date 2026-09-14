import { cookies } from "next/headers";
import { INDONESIA_PROVINCES } from "@/lib/provinces";
import type { HomeFeedPayload } from "./home-feed-types";

export type { HomeFeedPayload } from "./home-feed-types";

function emptyFeed(): HomeFeedPayload {
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
  };
}

export async function loadHomeFeed(): Promise<HomeFeedPayload> {
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
    if (!response.ok) return emptyFeed();
    const json = (await response.json()) as
      | { success: true; data: HomeFeedPayload }
      | { success: false };
    if (!json.success) return emptyFeed();
    return {
      ...json.data,
      provinces:
        json.data.provinces.length > 0
          ? json.data.provinces
          : emptyFeed().provinces,
    };
  } catch {
    return emptyFeed();
  }
}
