"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { ROUTES } from "@/lib/routes";
import { useTripChats } from "./useTripChats";
import { TripCoverImage } from "@/components/trip/TripCoverImage";
import { tripRoomBadgeClass, tripRoomStatusBadge } from "@/lib/realtime/chat-format";
import type { MyTripSummary } from "@/lib/contracts";

type RoomFilter = "all" | "active" | "done";

function isActiveTrip(trip: MyTripSummary) {
  return trip.status === "OPEN" || trip.status === "ONGOING" || trip.status === "DRAFT";
}

export function TripChatInbox({ activeTripId }: { activeTripId?: string }) {
  const { trips, loading } = useTripChats();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<RoomFilter>("all");

  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("id-ID");
    return trips.filter((trip) => {
      if (filter === "active" && !isActiveTrip(trip)) return false;
      if (filter === "done" && trip.status !== "COMPLETED" && trip.status !== "CLOSED") return false;
      if (!needle) return true;
      return `${trip.title} ${trip.destinationCity ?? ""}`.toLocaleLowerCase("id-ID").includes(needle);
    });
  }, [filter, query, trips]);

  const activeCount = trips.filter(isActiveTrip).length;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl bg-white p-3 shadow-sm md:p-4">
      <div className="flex shrink-0 items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Link
            href={ROUTES.tripSaya}
            className="grid h-9 w-9 flex-none place-items-center rounded-full text-primary hover:bg-surface-container-low"
            aria-label="Kembali ke trip saya"
          >
            <Icon name="arrow_back" />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-base font-extrabold">Pesan rombongan</h1>
            <p className="text-[11px] text-on-surface-variant">{trips.length} percakapan</p>
          </div>
        </div>
        {activeCount ? (
          <span className="rounded-full bg-secondary-container px-2 py-0.5 text-[11px] font-bold text-on-secondary-container">
            {activeCount} aktif
          </span>
        ) : null}
      </div>

      <label className="relative mt-3 shrink-0">
        <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant" />
        <span className="sr-only">Cari grup chat</span>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Cari obrolan, trip, kawan…"
          className="w-full rounded-xl bg-surface-container-low py-2 pl-9 pr-8 text-sm text-on-surface placeholder:text-on-surface-variant/70 focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        {query ? (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Hapus pencarian"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-on-surface-variant"
          >
            <Icon name="close" className="text-[18px]" />
          </button>
        ) : null}
      </label>

      <div className="mt-2 flex shrink-0 items-center gap-1.5 overflow-x-auto pb-1">
        {(
          [
            ["all", "Semua"],
            ["active", `Trip aktif (${activeCount})`],
            ["done", "Selesai"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={`whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-bold ${
              filter === id
                ? "bg-primary text-white shadow-sm"
                : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-2 min-h-0 flex-1 overflow-y-auto">
        {loading ? <p className="px-1 py-6 text-sm text-on-surface-variant">Memuat percakapan…</p> : null}

        {!loading && trips.length === 0 ? (
          <p className="px-1 py-6 text-sm leading-6 text-on-surface-variant">
            Belum ada grup chat. Buat atau ikuti trip dulu, lalu buka room-nya dari detail trip.
          </p>
        ) : null}

        {!loading && trips.length > 0 && visible.length === 0 ? (
          <p className="px-1 py-6 text-sm leading-6 text-on-surface-variant">Tidak ada grup yang cocok.</p>
        ) : null}

        <div className="flex flex-col gap-2">
          {visible.map((trip) => {
            const active = trip.id === activeTripId;
            const badge = tripRoomStatusBadge(trip.status);
            return (
              <Link
                key={trip.id}
                href={ROUTES.tripChat(trip.id)}
                aria-current={active ? "page" : undefined}
                className={`relative rounded-xl p-3 transition ${
                  active
                    ? "bg-surface-container-high shadow-sm"
                    : "bg-surface-container-low hover:bg-surface-container hover:shadow-sm"
                }`}
              >
                {active ? <span className="absolute bottom-2 left-0 top-2 w-1 rounded-r-full bg-primary" /> : null}
                <span className="flex items-start gap-3 pl-1">
                  <span className="relative h-11 w-11 flex-none overflow-hidden rounded-xl bg-surface-container-highest">
                    <TripCoverImage
                      place={trip.coverPlace}
                      destinationCity={trip.destinationCity}
                      title={trip.title}
                      className="h-full w-full"
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="mb-0.5 flex items-center justify-between gap-1">
                      <span className="truncate text-[13px] font-extrabold leading-tight">{trip.title}</span>
                      <span className={`whitespace-nowrap text-[11px] ${active ? "font-bold text-primary" : "text-on-surface-variant"}`}>
                        {trip.participantCount} orang
                      </span>
                    </span>
                    <span className="mb-1 flex items-center gap-1.5">
                      <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${tripRoomBadgeClass(badge.tone)}`}>
                        {badge.label}
                      </span>
                    </span>
                    <span className="block truncate text-[12px] text-on-surface-variant">
                      {trip.destinationCity ?? "Trip grup"}
                    </span>
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
