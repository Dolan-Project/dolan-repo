"use client";

import { Icon } from "@/components/ui/Icon";
import {
  INDONESIA_TILES,
  projectOnIndonesiaTiles,
} from "@/mocks/geo";

export type TripMapMarker = {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
  selected?: boolean;
  tone?: "meeting" | "origin";
};

const tileXs = range(INDONESIA_TILES.minX, INDONESIA_TILES.maxX);
const tileYs = range(INDONESIA_TILES.minY, INDONESIA_TILES.maxY);

function range(from: number, to: number) {
  return Array.from({ length: to - from + 1 }, (_, index) => from + index);
}

export function TripBoardMap({
  markers,
  compact = false,
  onSelect,
}: {
  markers: TripMapMarker[];
  compact?: boolean;
  onSelect?: (id: string) => void;
}) {
  return (
    <div
      className={`relative overflow-hidden bg-[#9ec5d8] ${
        compact ? "h-48 rounded-2xl" : "h-full min-h-[320px]"
      }`}
    >
      <div
        className="absolute inset-0 grid"
        style={{
          gridTemplateColumns: `repeat(${tileXs.length}, minmax(0, 1fr))`,
          gridTemplateRows: `repeat(${tileYs.length}, minmax(0, 1fr))`,
        }}
      >
        {tileYs.flatMap((y) =>
          tileXs.map((x) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={`${x}-${y}`}
              alt=""
              className="h-full w-full object-cover"
              src={`https://tile.openstreetmap.org/${INDONESIA_TILES.z}/${x}/${y}.png`}
            />
          )),
        )}
      </div>
      <div className="absolute inset-0 bg-linear-to-b from-surface/10 via-transparent to-surface/25" />
      {markers.map((marker) => {
        const pos = projectOnIndonesiaTiles(marker.latitude, marker.longitude);
        const selected = Boolean(marker.selected);
        const origin = marker.tone === "origin";
        return (
          <button
            key={marker.id}
            type="button"
            onClick={() => onSelect?.(marker.id)}
            className="absolute z-10 -translate-x-1/2 -translate-y-full"
            style={{ left: `${pos.left}%`, top: `${pos.top}%` }}
            aria-current={selected ? "true" : undefined}
            aria-label={`Pilih ${marker.label}`}
          >
            {selected ? (
              <span className="absolute inset-x-2 top-2 h-6 animate-ping rounded-full bg-primary/30" />
            ) : null}
            <span
              className={`relative flex items-center gap-1 rounded-full py-1 pl-1 pr-2.5 shadow-lg ${
                selected
                  ? "bg-primary text-on-primary"
                  : origin
                    ? "bg-secondary-container text-on-secondary-container"
                    : "bg-surface-container-lowest text-on-surface"
              }`}
            >
              <Icon name="location_on" filled className="text-[18px]" />
              <span className="type-micro max-w-36 truncate">{marker.label}</span>
            </span>
          </button>
        );
      })}
      <p className="absolute bottom-2 left-2 z-10 rounded-lg bg-surface-container-lowest/90 px-2 py-1 type-micro text-on-surface-variant">
        © OpenStreetMap · titik temu publik, bukan rute jalan
      </p>
    </div>
  );
}
