"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { PlaceSummary } from "@dolan/shared";
import { Icon } from "@/components/ui/Icon";
import { PlacePhoto } from "@/features/explore/PlacePhoto";
import { searchExplore } from "@/features/explore/api";

type CuratedPlace = { name: string; description: string; searchQuery: string; googleMapsUrl: string };

export function ProvincePlacesGrid({ provinceName, places }: { provinceName: string; places: readonly CuratedPlace[] }) {
  const [live, setLive] = useState<Array<PlaceSummary | null>>(places.map(() => null));
  useEffect(() => {
    const controller = new AbortController();
    void Promise.all(places.map(async (place) => {
      try {
        const page = await searchExplore({ tab: "wisata", query: place.searchQuery, sort: "relevance", page: 1, signal: controller.signal });
        return (page.items.find((item): item is PlaceSummary => "googlePlaceId" in item) ?? null);
      } catch { return null; }
    })).then((items) => { if (!controller.signal.aborted) setLive(items); });
    return () => controller.abort();
  }, [places]);

  return <div className="mt-6 grid gap-4 md:grid-cols-5">{places.map((place, index) => {
    const google = live[index];
    const detailHref = google ? `/wisata/${encodeURIComponent(google.googlePlaceId)}` : `/jelajah?q=${encodeURIComponent(place.searchQuery)}`;
    return <article key={place.name} className="group overflow-hidden rounded-3xl border border-outline-variant/35 bg-surface-container-lowest shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      {google ? <PlacePhoto googlePlaceId={google.googlePlaceId} photoName={google.photoName} photoUri={google.photoUri} alt={google.name} className="h-36 w-full" /> : <div className="flex h-36 items-end bg-gradient-to-br from-sky-500 via-cyan-500 to-emerald-400 p-4 text-white"><span className="rounded-full bg-black/20 px-3 py-1 text-xs font-extrabold backdrop-blur">#{index + 1} {provinceName}</span></div>}
      <div className="p-4"><div className="flex items-center justify-between gap-2"><h3 className="font-extrabold text-on-surface">{google?.name ?? place.name}</h3>{google?.rating ? <span className="text-xs font-bold text-secondary">★ {google.rating}</span> : null}</div><p className="mt-2 line-clamp-3 text-xs leading-5 text-on-surface-variant">{place.description}</p><div className="mt-4 flex gap-2"><Link className="flex-1 rounded-xl bg-primary px-3 py-2 text-center text-xs font-bold text-on-primary" href={detailHref}>Detail wisata</Link><a className="grid h-9 w-9 place-items-center rounded-xl border border-outline-variant" href={place.googleMapsUrl} target="_blank" rel="noreferrer" aria-label={`Buka ${place.name} di Google Maps`}><Icon name="map" /></a></div></div>
    </article>;
  })}</div>;
}
