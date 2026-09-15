import { cookies } from "next/headers";
import { shouldUseMockApi } from "@/lib/auth/use-mock";
import { INDONESIA_PROVINCES } from "@/lib/provinces";
import type { HomeFeedPayload } from "./home-feed-types";

export type { HomeFeedPayload } from "./home-feed-types";

export type HomeFeedResult =
  | { ok: true; data: HomeFeedPayload }
  | { ok: false; error: string; data: HomeFeedPayload };

function emptyFeed(): HomeFeedPayload {
  return {
    trips: [],
    templates: INDONESIA_PROVINCES.slice(0, 6).map((province) => ({
      id: province.template.id,
      title: province.template.title,
      city: province.name,
      durationDays: province.template.durationDays,
      sourceLabel: "Kurasi Dolan",
      usageCount: 0,
      popularityLabel: null,
    })),
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

export async function loadHomeFeed(): Promise<HomeFeedResult> {
  if (shouldUseMockApi()) {
    return { ok: true, data: emptyFeed() };
  }

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
      return { ok: true, data: emptyFeed() };
    }
    const json = (await response.json()) as
      | { success: true; data: HomeFeedPayload }
      | { success: false; error?: { message?: string } };
    if (!json.success) {
      return { ok: true, data: emptyFeed() };
    }
    return {
      ok: true,
      data: {
        ...json.data,
        provinces:
          json.data.provinces.length > 0
            ? json.data.provinces
            : emptyFeed().provinces,
      },
    };
  } catch {
    return { ok: true, data: emptyFeed() };
  }
}
