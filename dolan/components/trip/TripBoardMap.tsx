"use client";

import { useEffect, useMemo, useState } from "react";
import { GoogleMap, type MapPoint } from "@/features/explore/GoogleMap";
import { Icon } from "@/components/ui/Icon";

export type TripMapMarker = {
  id: string; label: string; latitude: number; longitude: number;
  selected?: boolean; tone?: "meeting" | "origin"; sequence?: number;
};

function toPoints(markers: TripMapMarker[]): MapPoint[] {
  return markers.map((marker) => ({ id: marker.id, label: marker.label, lat: marker.latitude, lng: marker.longitude, sequence: marker.sequence }));
}

export function TripBoardMap({
  markers,
  compact = false,
  onSelect,
  routeColor = "#004ac6",
  numberedBadges = true,
  routeGroups,
}: {
  markers: TripMapMarker[];
  compact?: boolean;
  onSelect?: (id: string) => void;
  routeColor?: string;
  numberedBadges?: boolean;
  routeGroups?: TripMapMarker[][];
}) {
  const [mapType, setMapType] = useState<"roadmap" | "satellite">("roadmap");
  const [zoomCommand, setZoomCommand] = useState<{ id: number; delta: 1 | -1 } | null>(null);
  const [myLocation, setMyLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [routePolylines, setRoutePolylines] = useState<string[]>([]);
  const points = useMemo(() => toPoints(markers), [markers]);
  const groups = useMemo(
    () => (routeGroups?.length ? routeGroups.map(toPoints) : points.length >= 2 ? [points] : []),
    [points, routeGroups],
  );
  const selectedId = markers.find((marker) => marker.selected)?.id ?? markers[0]?.id ?? null;
  const groupKey = groups.map((group) => group.map((point) => `${point.lat},${point.lng}`).join(">")).join("|");
  useEffect(() => {
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRoutePolylines([]);
    const valid = groups.filter((group) => group.length >= 2);
    if (!valid.length) return () => controller.abort();
    void Promise.all(valid.map((group) => fetch("/api/v1/routes/preview", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ points: group.map(({ lat, lng }) => ({ lat, lng })) }),
      signal: controller.signal,
    }).then(async (response) => (response.ok ? response.json() : null)).catch(() => null)))
      .then((payloads) => {
        if (controller.signal.aborted) return;
        const encoded = payloads.flatMap((payload: { data?: { segments?: Array<{ ok: boolean; encodedPolyline?: string }> } } | null) => (
          payload?.data?.segments?.filter((segment) => segment.ok && segment.encodedPolyline).map((segment) => segment.encodedPolyline!) ?? []
        ));
        setRoutePolylines(encoded);
      });
    return () => controller.abort();
  }, [groupKey]);
  function locate() { navigator.geolocation?.getCurrentPosition((position) => setMyLocation({ lat: position.coords.latitude, lng: position.coords.longitude })); }
  return <div className={`relative overflow-hidden bg-white ${compact ? "h-48 rounded-2xl" : "h-full min-h-[320px]"}`}>
    <GoogleMap points={points} selectedId={selectedId} onSelect={(id) => onSelect?.(id)} mapType={mapType} focusCenter={myLocation} zoomCommand={zoomCommand} showRoute={groups.some((group) => group.length > 1)} routePolylines={routePolylines} routeGroups={groups} routeColor={routeColor} numberedBadges={numberedBadges} className="h-full w-full" />
    <div className="absolute right-3 top-3 z-20 grid overflow-hidden rounded-2xl border border-white/80 bg-white/95 shadow-lg backdrop-blur">
      <button type="button" className="grid h-10 w-10 place-items-center border-b border-outline-variant/40" onClick={() => setMapType((type) => type === "roadmap" ? "satellite" : "roadmap")} aria-label="Ubah jenis peta"><Icon name="layers" /></button>
      <button type="button" className="grid h-10 w-10 place-items-center border-b border-outline-variant/40" onClick={locate} aria-label="Lokasi saya"><Icon name="my_location" /></button>
      <button type="button" className="grid h-10 w-10 place-items-center border-b border-outline-variant/40" onClick={() => setZoomCommand({ id: Date.now(), delta: 1 })} aria-label="Perbesar"><Icon name="add" /></button>
      <button type="button" className="grid h-10 w-10 place-items-center" onClick={() => setZoomCommand({ id: Date.now(), delta: -1 })} aria-label="Perkecil"><Icon name="remove" /></button>
    </div>
    <p className="absolute bottom-2 left-2 z-10 rounded-lg bg-white/90 px-2 py-1 text-[10px] font-bold text-on-surface-variant">Google Maps · garis rute per hari mengikuti jalan</p>
  </div>;
}
