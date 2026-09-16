"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { ROUTES } from "@/lib/routes";
import { useTripChats } from "./useTripChats";
import { destinationCoverUrl } from "@/lib/destination-itinerary";

export function TripChatInbox({ activeTripId }: { activeTripId?: string }) {
  const { trips, loading } = useTripChats();

  return (
    <aside className="flex h-full min-h-0 flex-col border-r border-sky-100 bg-white">
      <div className="flex items-center gap-3 border-b border-sky-100 px-4 py-4">
        <Link href={ROUTES.tripSaya} className="grid h-10 w-10 place-items-center rounded-full text-primary hover:bg-surface-container" aria-label="Kembali ke trip saya">
          <Icon name="arrow_back" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-primary">Percakapan</p>
          <h1 className="truncate text-lg font-extrabold text-on-surface">Chat grup trip</h1>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-3">
        {loading ? <p className="px-3 py-6 text-sm text-on-surface-variant">Memuat percakapan…</p> : null}
        {!loading && trips.length === 0 ? (
          <p className="px-3 py-6 text-sm leading-6 text-on-surface-variant">Belum ada grup chat. Buat atau ikuti trip dulu, lalu buka room-nya dari detail trip.</p>
        ) : null}
        {trips.map((trip) => {
          const active = trip.id === activeTripId;
          return (
            <Link
              key={trip.id}
              href={ROUTES.tripChat(trip.id)}
              className={`mb-1 flex items-start gap-3 rounded-2xl px-3 py-3 ${active ? "bg-primary-fixed text-primary" : "text-on-surface hover:bg-surface-container-low"}`}
            >
              <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-2xl bg-surface-container">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={destinationCoverUrl(trip.destinationCity ?? trip.title)} alt="" className="h-full w-full object-cover" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-extrabold">{trip.title}</span>
                <span className={`mt-0.5 block truncate text-xs ${active ? "text-primary/70" : "text-on-surface-variant"}`}>
                  {trip.destinationCity ?? "Trip grup"} · {trip.participantCount} orang
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
