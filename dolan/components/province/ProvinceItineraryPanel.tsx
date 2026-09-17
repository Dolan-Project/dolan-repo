"use client";

import type { EditableItineraryDay } from "@dolan/shared";
import { TripBoardMap } from "@/components/trip/TripBoardMap";
import { ItineraryTimeline } from "@/components/trip/ItineraryTimeline";
import { itineraryMapMarkers, itineraryMapRouteGroups, visitWindowLabel } from "@/lib/template-itinerary";
import { ITINERARY_ROUTE_COLOR } from "@/lib/itinerary-style";

export function ProvinceItineraryPanel({
  days,
  destination,
}: {
  days: EditableItineraryDay[];
  destination: string;
}) {
  const markers = itineraryMapMarkers(days, days[0]?.stops[0]?.id ?? null);
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(280px,0.95fr)] lg:items-start">
      <div className="space-y-5">
        {days.map((day) => {
          const offset = days.filter((item) => item.dayNumber < day.dayNumber).reduce((sum, item) => sum + item.stops.length, 0);
          return (
            <section key={day.id}>
              <p className="mb-3 type-micro font-extrabold uppercase tracking-[0.14em] text-primary">Hari {day.dayNumber}</p>
              <ItineraryTimeline
                items={day.stops.map((stop, index) => ({
                  id: stop.id,
                  index: offset + index,
                  sequence: stop.sequence,
                  title: stop.customTitle || stop.place?.name || "Titik rute",
                  meta: visitWindowLabel(stop.startTime, stop.durationMinutes) || undefined,
                  notes: stop.notes ?? undefined,
                }))}
              />
            </section>
          );
        })}
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 lg:sticky lg:top-24">
        <div className="border-b border-outline-variant/40 px-4 py-3">
          <p className="type-caption font-bold text-on-surface">Peta rute {destination}</p>
          <p className="type-caption text-on-surface-variant">Pin berwarna mengikuti urutan itinerary. Garis biru mengikuti jalan.</p>
        </div>
        <div className="h-[280px] md:h-[360px] lg:h-[420px]">
          {markers.length ? (
            <TripBoardMap markers={markers} numberedBadges routeColor={ITINERARY_ROUTE_COLOR} routeGroups={itineraryMapRouteGroups(days)} />
          ) : (
            <div className="grid h-full place-items-center bg-surface-container px-4 text-center type-caption text-on-surface-variant">Koordinat rute belum tersedia.</div>
          )}
        </div>
      </div>
    </div>
  );
}
