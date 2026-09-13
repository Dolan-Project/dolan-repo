"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";

export type MapPoint = {
  id: string;
  label: string;
  lat: number;
  lng: number;
};

type GoogleMapProps = {
  points: MapPoint[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onViewportChanged?: (center: { lat: number; lng: number }) => void;
  mapType?: "roadmap" | "satellite";
  focusCenter?: { lat: number; lng: number } | null;
  zoomCommand?: { id: number; delta: 1 | -1 } | null;
  searchOverlay?: boolean;
  className?: string;
};

declare global {
  interface Window {
    __dolanGoogleMaps?: Promise<void>;
    google?: {
      maps: {
        Map: new (node: HTMLElement, options: Record<string, unknown>) => GoogleMapInstance;
        Marker: new (options: Record<string, unknown>) => GoogleMarker;
        LatLngBounds: new () => GoogleBounds;
        Point: new (x: number, y: number) => object;
        event: { clearInstanceListeners(instance: object): void };
      };
    };
  }
}

type GoogleMapInstance = {
  fitBounds(bounds: GoogleBounds, padding?: number): void;
  panTo(position: { lat: number; lng: number }): void;
  setZoom(zoom: number): void;
  getZoom(): number | undefined;
  setMapTypeId(mapTypeId: "roadmap" | "satellite"): void;
  getCenter(): { lat(): number; lng(): number } | null;
  addListener(event: string, handler: () => void): { remove(): void };
};
type GoogleMarker = {
  setMap(map: GoogleMapInstance | null): void;
  setIcon(icon: Record<string, unknown> | string | null): void;
  setZIndex(zIndex: number | null): void;
  addListener(event: string, handler: () => void): { remove(): void };
};
type GoogleBounds = {
  extend(position: { lat: number; lng: number }): void;
};

function loadGoogleMaps(apiKey: string) {
  if (window.google?.maps) return Promise.resolve();
  if (window.__dolanGoogleMaps) return window.__dolanGoogleMaps;
  window.__dolanGoogleMaps = new Promise<void>((resolve, reject) => {
    const callback = `__dolanMapsReady_${Date.now()}`;
    const callbackWindow = window as unknown as Window & Record<string, unknown>;
    callbackWindow[callback] = () => {
      delete callbackWindow[callback];
      resolve();
    };
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&loading=async&callback=${callback}&v=weekly`;
    script.async = true;
    script.onerror = () => reject(new Error("Google Maps gagal dimuat"));
    document.head.appendChild(script);
  });
  return window.__dolanGoogleMaps;
}

function destinationPin(selected: boolean, maps: NonNullable<Window["google"]>["maps"]) {
  const color = selected ? "#ef3b69" : "#1688f8";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42"><filter id="s" x="-35%" y="-20%" width="170%" height="170%"><feDropShadow dx="0" dy="2" stdDeviation="1.8" flood-opacity=".3"/></filter><path filter="url(#s)" d="M16 1.5C8.27 1.5 2 7.77 2 15.5 2 26.1 16 40 16 40s14-13.9 14-24.5c0-7.73-6.27-14-14-14Z" fill="${color}" stroke="white" stroke-width="2"/><circle cx="16" cy="15.5" r="5.25" fill="white"/><circle cx="16" cy="15.5" r="2.35" fill="${color}"/></svg>`;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    anchor: new maps.Point(16, 40),
  };
}

export function GoogleMap({
  points,
  selectedId,
  onSelect,
  onViewportChanged,
  mapType = "roadmap",
  focusCenter,
  zoomCommand,
  searchOverlay = false,
  className = "",
}: GoogleMapProps) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<GoogleMapInstance | null>(null);
  const markersRef = useRef(new Map<string, GoogleMarker>());
  const locationMarkerRef = useRef<GoogleMarker | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY ?? "";

  useEffect(() => {
    if (!apiKey || !nodeRef.current) return;
    let active = true;
    loadGoogleMaps(apiKey)
      .then(() => {
        if (!active || !nodeRef.current || !window.google) return;
        const map = new window.google.maps.Map(nodeRef.current, {
          center: { lat: -2.5, lng: 118 },
          zoom: 5,
          mapTypeId: "roadmap",
          mapId: process.env.NEXT_PUBLIC_GOOGLE_MAP_ID || undefined,
          disableDefaultUI: true,
          zoomControl: false,
          gestureHandling: "greedy",
          clickableIcons: false,
        });
        mapRef.current = map;
        setMapReady(true);
        let dragged = false;
        map.addListener("dragstart", () => {
          dragged = true;
        });
        map.addListener("idle", () => {
          if (!dragged) return;
          const center = map.getCenter();
          if (center) onViewportChanged?.({ lat: center.lat(), lng: center.lng() });
          dragged = false;
        });
      })
      .catch(() => active && setError("Peta Google belum dapat dimuat."));
    return () => {
      active = false;
      if (mapRef.current && window.google) {
        window.google.maps.event.clearInstanceListeners(mapRef.current);
      }
      locationMarkerRef.current?.setMap(null);
      locationMarkerRef.current = null;
      mapRef.current = null;
      setMapReady(false);
    };
  }, [apiKey, onViewportChanged]);

  useEffect(() => {
    mapRef.current?.setMapTypeId(mapType);
  }, [mapReady, mapType]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !zoomCommand) return;
    map.setZoom(Math.max(3, Math.min(20, (map.getZoom() ?? 6) + zoomCommand.delta)));
  }, [mapReady, zoomCommand]);

  useEffect(() => {
    const map = mapRef.current;
    const maps = window.google?.maps;
    if (!focusCenter || !map || !maps) return;
    locationMarkerRef.current?.setMap(null);
    locationMarkerRef.current = new maps.Marker({
      map,
      position: focusCenter,
      title: "Lokasi saya",
      icon: {
        path: "M 0,0 m -7,0 a 7,7 0 1,0 14,0 a 7,7 0 1,0 -14,0",
        fillColor: "#1677ff",
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 4,
        scale: 1,
      },
    });
    map.panTo(focusCenter);
    map.setZoom(15);
  }, [focusCenter, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    const maps = window.google?.maps;
    if (!map || !maps) return;
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current.clear();
    const bounds = new maps.LatLngBounds();
    points.forEach((point) => {
      const marker = new maps.Marker({
        map,
        position: { lat: point.lat, lng: point.lng },
        title: point.label,
        icon: destinationPin(false, maps),
        zIndex: 1,
      });
      marker.addListener("click", () => onSelect(point.id));
      markersRef.current.set(point.id, marker);
      bounds.extend({ lat: point.lat, lng: point.lng });
    });
    if (points.length > 1) map.fitBounds(bounds, 72);
    if (points.length === 1) {
      map.panTo({ lat: points[0]!.lat, lng: points[0]!.lng });
      map.setZoom(14);
    }
  }, [mapReady, onSelect, points]);

  useEffect(() => {
    const point = points.find((item) => item.id === selectedId);
    const map = mapRef.current;
    const maps = window.google?.maps;
    if (!point || !map || !maps) return;
    map.panTo({ lat: point.lat, lng: point.lng });
    markersRef.current.forEach((marker, id) => {
      const selected = id === selectedId;
      marker.setIcon(destinationPin(selected, maps));
      marker.setZIndex(selected ? 1000 : null);
    });
  }, [mapReady, points, selectedId]);

  if (!apiKey || error) {
    return (
      <div className={`relative overflow-hidden bg-[#dff1f4] ${className}`}>
        <div className="absolute inset-0 opacity-50 [background-image:linear-gradient(30deg,#b8d8d2_12%,transparent_12.5%,transparent_87%,#b8d8d2_87.5%,#b8d8d2),linear-gradient(150deg,#b8d8d2_12%,transparent_12.5%,transparent_87%,#b8d8d2_87.5%,#b8d8d2),linear-gradient(30deg,#b8d8d2_12%,transparent_12.5%,transparent_87%,#b8d8d2_87.5%,#b8d8d2),linear-gradient(150deg,#b8d8d2_12%,transparent_12.5%,transparent_87%,#b8d8d2_87.5%,#b8d8d2)] [background-position:0_0,0_0,40px_70px,40px_70px] [background-size:80px_140px]" />
        {points.slice(0, 5).map((point, index) => (
          <button
            key={point.id}
            type="button"
            onClick={() => onSelect(point.id)}
            className={`absolute z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 border-white shadow-lg ${point.id === selectedId ? "bg-secondary-container text-white" : "bg-primary text-white"}`}
            style={{ left: `${20 + ((index * 17) % 60)}%`, top: `${20 + ((index * 21) % 55)}%` }}
            aria-label={`Pilih ${point.label}`}
          >
            <Icon name="location_on" className="text-[22px]" />
          </button>
        ))}
        <div className={`absolute z-10 rounded-2xl border border-white/70 bg-white/90 p-3 text-center shadow-lg backdrop-blur ${searchOverlay ? "left-4 right-20 top-20 lg:inset-x-4 lg:top-4" : "inset-x-4 top-4"}`}>
          <p className="type-label text-on-surface">{error ?? "Tambahkan browser key Google Maps"}</p>
          <p className="type-caption mt-0.5 text-on-surface-variant">Data tempat tetap bisa dijelajahi dari daftar.</p>
        </div>
      </div>
    );
  }

  return <div ref={nodeRef} className={className} aria-label="Peta lokasi wisata" />;
}
