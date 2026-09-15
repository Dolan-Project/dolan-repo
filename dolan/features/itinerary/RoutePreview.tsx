"use client";

import { useEffect, useMemo, useState } from "react";
import type { EditableItineraryDay } from "@dolan/shared";
import { Icon } from "@/components/ui/Icon";
import { GoogleMap } from "@/features/explore/GoogleMap";
import { itineraryHasUnavailableRoute, ROUTE_UNAVAILABLE_TEXT } from "@/lib/route-travel";

export function RoutePreview({
  days,
  destination,
}: {
  days: EditableItineraryDay[];
  destination?: string;
}) {
  const stops = useMemo(() => days.flatMap((day) => day.stops), [days]);
  const totalTravel = stops.reduce((sum, stop) => sum + (stop.travelDurationMinutes ?? 0), 0);
  const points = useMemo(
    () => stops.flatMap((stop) =>
      stop.place ? [{ id: stop.id, label: stop.place.name, lat: stop.place.latitude, lng: stop.place.longitude }] : [],
    ),
    [stops],
  );
  const storedPolylines = useMemo(
    () => stops.map((stop) => stop.routePolyline).filter((value): value is string => Boolean(value)),
    [stops],
  );
  const unavailable = itineraryHasUnavailableRoute(days);
  const [previewPolylines, setPreviewPolylines] = useState<string[]>([]);
  const routePolylines = storedPolylines.length > 0 ? storedPolylines : previewPolylines;

  useEffect(() => {
    if (storedPolylines.length > 0 || points.length < 2) {
      setPreviewPolylines([]);
      return;
    }
    const controller = new AbortController();
    void fetch("/api/v1/routes/preview", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ points: points.slice(0, 10).map(({ lat, lng }) => ({ lat, lng })) }),
      signal: controller.signal,
    })
      .then(async (response) => (response.ok ? response.json() : null))
      .then((payload: { data?: { segments?: Array<{ ok: boolean; encodedPolyline?: string }> } } | null) => {
        if (controller.signal.aborted) return;
        setPreviewPolylines(
          payload?.data?.segments?.filter((segment) => segment.ok && segment.encodedPolyline).map((segment) => segment.encodedPolyline!) ?? [],
        );
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [points, storedPolylines.length]);

  return (
    <aside className="overflow-hidden rounded-[1.75rem] border border-white/70 bg-[#d7ebed] shadow-[0_20px_55px_rgba(15,40,70,.16)] lg:sticky lg:top-24 lg:h-[calc(100vh-7rem)]">
      <div className="relative min-h-[350px] h-full overflow-hidden">
        <GoogleMap
          points={points}
          selectedId={null}
          onSelect={() => undefined}
          numberedBadges
          showRoute={points.length > 1}
          routePolylines={routePolylines}
          routeUnavailable={unavailable || (points.length > 1 && routePolylines.length === 0)}
          routeColor="#004ac6"
          className="absolute inset-0 h-full w-full"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-[#071c32]/20" />
        <div className="absolute left-4 right-4 top-4 rounded-2xl border border-white/60 bg-white/88 p-4 shadow-lg backdrop-blur-md">
          <p className="type-micro uppercase tracking-wider text-secondary">Route overview</p>
          <h2 className="type-subtitle mt-1">{destination || "Rute perjalanan"}</h2>
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-on-surface-variant">
            <span className="chip bg-primary-fixed"><Icon name="location_on" /> {stops.length} destinasi</span>
            <span className="chip bg-secondary-fixed"><Icon name="schedule" /> {Math.round(totalTravel / 60)} jam perjalanan</span>
          </div>
        </div>
        <div className="absolute bottom-4 left-4 right-4 rounded-2xl bg-[#071c32]/88 p-4 text-white backdrop-blur-md">
          <p className="type-label">Rute mengikuti jalan Google Maps</p>
          <p className="type-caption mt-1 text-white/70">
            {unavailable || (points.length > 1 && routePolylines.length === 0)
              ? ROUTE_UNAVAILABLE_TEXT
              : routePolylines.length > 0
                ? "Garis biru mengikuti jalan yang tersedia, bukan tarikan lurus antar titik."
                : "Tambahkan browser key dan server key Google Maps agar garis rute mengikuti jalan."}
          </p>
        </div>
      </div>
    </aside>
  );
}
