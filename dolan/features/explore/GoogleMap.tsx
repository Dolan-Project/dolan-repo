"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { decodePolyline } from "./map-route";
import { itineraryPinSvg, ITINERARY_ROUTE_COLOR } from "@/lib/itinerary-style";
import { ItineraryStopPin } from "@/components/trip/ItineraryTimeline";

export type MapPoint = {
  id: string;
  label: string;
  lat: number;
  lng: number;
  sequence?: number;
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
  showRoute?: boolean;
  routePolylines?: string[];
  routeColor?: string;
  numberedBadges?: boolean;
  routeGroups?: MapPoint[][];
};

declare global {
  interface Window {
    __dolanGoogleMaps?: Promise<void>;
    google?: {
      maps: {
        Map: new (node: HTMLElement, options: Record<string, unknown>) => GoogleMapInstance;
        Marker: new (options: Record<string, unknown>) => GoogleMarker;
        Polyline: new (options: Record<string, unknown>) => GooglePolyline;
        LatLngBounds: new () => GoogleBounds;
        Point: new (x: number, y: number) => object;
        TravelMode?: { DRIVING: string; WALKING: string };
        DirectionsService?: new () => GoogleDirectionsService;
        importLibrary?: (name: string) => Promise<{
          DirectionsService?: new () => GoogleDirectionsService;
          TravelMode?: { DRIVING: string };
        }>;
        event: { clearInstanceListeners(instance: object): void; trigger(instance: object, eventName: string): void };
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
type GooglePolyline = { setMap(map: GoogleMapInstance | null): void };
type GoogleBounds = {
  extend(position: { lat: number; lng: number }): void;
};
type GoogleDirectionsService = {
  route(
    request: {
      origin: { lat: number; lng: number };
      destination: { lat: number; lng: number };
      waypoints?: Array<{ location: { lat: number; lng: number }; stopover?: boolean }>;
      optimizeWaypoints?: boolean;
      travelMode: string;
      provideRouteAlternatives?: boolean;
    },
    callback: (
      result: { routes?: Array<{ overview_path?: Array<{ lat(): number; lng(): number }> }> } | null,
      status: string,
    ) => void,
  ): void;
};

function requestOnce(
  maps: NonNullable<Window["google"]>["maps"],
  points: Array<{ lat: number; lng: number }>,
) {
  return new Promise<Array<{ lat: number; lng: number }>>((resolve) => {
    if (points.length < 2) {
      resolve(points);
      return;
    }
    const finish = (serviceCtor: (new () => GoogleDirectionsService) | undefined, travelMode: string | undefined) => {
      if (!serviceCtor || !travelMode) {
        resolve(points);
        return;
      }
      const origin = points[0]!;
      const destination = points[points.length - 1]!;
      const waypoints = points.slice(1, -1).map((location) => ({ location, stopover: true }));
      const service = new serviceCtor();
      service.route(
        {
          origin,
          destination,
          waypoints: waypoints.length ? waypoints : undefined,
          optimizeWaypoints: false,
          travelMode,
          provideRouteAlternatives: false,
        },
        (result, status) => {
          const path = result?.routes?.[0]?.overview_path;
          if (status === "OK" && path && path.length >= 2) {
            resolve(path.map((point) => ({ lat: point.lat(), lng: point.lng() })));
            return;
          }
          resolve(points);
        },
      );
    };
    if (maps.importLibrary) {
      void maps.importLibrary("routes").then((library) => {
        finish(library.DirectionsService ?? maps.DirectionsService, library.TravelMode?.DRIVING ?? maps.TravelMode?.DRIVING);
      }).catch(() => finish(maps.DirectionsService, maps.TravelMode?.DRIVING));
      return;
    }
    finish(maps.DirectionsService, maps.TravelMode?.DRIVING);
  });
}

async function requestDrivingRoute(
  maps: NonNullable<Window["google"]>["maps"],
  points: Array<{ lat: number; lng: number }>,
) {
  if (points.length < 2) return points;
  const chunkSize = 10;
  if (points.length <= chunkSize) return requestOnce(maps, points);
  const path: Array<{ lat: number; lng: number }> = [];
  for (let index = 0; index < points.length - 1; ) {
    const chunk = points.slice(index, Math.min(index + chunkSize, points.length));
    const piece = await requestOnce(maps, chunk);
    if (path.length) path.push(...piece.slice(1));
    else path.push(...piece);
    index += chunkSize - 1;
  }
  return path;
}

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

function destinationPin(
  selected: boolean,
  maps: NonNullable<Window["google"]>["maps"],
  sequence?: number,
  color?: string,
) {
  const index = Math.max(0, (sequence ?? 1) - 1);
  const svg = itineraryPinSvg(index, sequence ?? index + 1, selected, color);
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
  showRoute = false,
  routePolylines = [],
  routeColor = ITINERARY_ROUTE_COLOR,
  numberedBadges = false,
  routeGroups,
}: GoogleMapProps) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<GoogleMapInstance | null>(null);
  const markersRef = useRef(new Map<string, GoogleMarker>());
  const locationMarkerRef = useRef<GoogleMarker | null>(null);
  const routeLinesRef = useRef<GooglePolyline[]>([]);
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
      routeLinesRef.current.forEach((line) => line.setMap(null));
      routeLinesRef.current = [];
      mapRef.current = null;
      setMapReady(false);
    };
  }, [apiKey, onViewportChanged]);

  useEffect(() => {
    const node = nodeRef.current;
    const map = mapRef.current;
    if (!node || !map || !mapReady || !window.google) return;
    const resize = () => {
      window.google?.maps.event.trigger(map, "resize");
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(node);
    return () => observer.disconnect();
  }, [mapReady]);

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
    let cancelled = false;
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current.clear();
    const bounds = new maps.LatLngBounds();
    points.forEach((point, index) => {
      const marker = new maps.Marker({
        map,
        position: { lat: point.lat, lng: point.lng },
        title: point.label,
        icon: destinationPin(false, maps, point.sequence ?? index + 1),
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
    routeLinesRef.current.forEach((line) => line.setMap(null));
    routeLinesRef.current = [];
    const addRoadPath = (path: Array<{ lat: number; lng: number }>) => {
      if (path.length < 2 || cancelled) return;
      const casing = new maps.Polyline({
        map,
        path,
        geodesic: false,
        strokeColor: "#00174b",
        strokeOpacity: 0.9,
        strokeWeight: 8,
        zIndex: 1,
      });
      const line = new maps.Polyline({
        map,
        path,
        geodesic: false,
        strokeColor: routeColor,
        strokeOpacity: 1,
        strokeWeight: 5,
        zIndex: 2,
      });
      routeLinesRef.current.push(casing, line);
    };
    const encodedAvailable = routePolylines.length > 0;
    if (encodedAvailable) {
      routePolylines.forEach((encoded) => addRoadPath(decodePolyline(encoded)));
      return () => {
        cancelled = true;
        routeLinesRef.current.forEach((line) => line.setMap(null));
        routeLinesRef.current = [];
      };
    }
    const groups = (routeGroups?.length ? routeGroups : showRoute ? [points] : []).filter((group) => group.length >= 2);
    void (async () => {
      for (const group of groups) {
        if (cancelled) return;
        const path = await requestDrivingRoute(maps, group.map((point) => ({ lat: point.lat, lng: point.lng })));
        if (cancelled) return;
        addRoadPath(path);
      }
    })();
    return () => {
      cancelled = true;
      routeLinesRef.current.forEach((line) => line.setMap(null));
      routeLinesRef.current = [];
    };
  }, [mapReady, numberedBadges, onSelect, points, routeColor, routeGroups, routePolylines, showRoute]);

  useEffect(() => {
    const point = points.find((item) => item.id === selectedId);
    const map = mapRef.current;
    const maps = window.google?.maps;
    if (!point || !map || !maps) return;
    if (!(showRoute && points.length > 1)) {
      map.panTo({ lat: point.lat, lng: point.lng });
    }
    markersRef.current.forEach((marker, id) => {
      const selected = id === selectedId;
      const mapped = points.find((item) => item.id === id);
      const sequence = mapped?.sequence ?? points.findIndex((item) => item.id === id) + 1;
      marker.setIcon(destinationPin(selected, maps, sequence > 0 ? sequence : undefined));
      marker.setZIndex(selected ? 1000 : null);
    });
  }, [mapReady, numberedBadges, points, routeColor, selectedId, showRoute]);

  if (!apiKey || error) {
    return (
      <div className={`relative overflow-hidden bg-white ${className}`}>
        <div className="absolute inset-0 bg-slate-50" />
        {points.map((point, index) => (
          <button
            key={point.id}
            type="button"
            onClick={() => onSelect(point.id)}
            className="absolute z-10"
            style={{ left: `${12 + ((index * 11) % 76)}%`, top: `${14 + ((index * 13) % 68)}%` }}
            aria-label={`Pilih ${point.label}`}
          >
            <ItineraryStopPin index={index} sequence={point.sequence ?? index + 1} selected={point.id === selectedId} />
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
