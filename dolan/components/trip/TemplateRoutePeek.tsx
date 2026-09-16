"use client";

import { useMemo, useState } from "react";
import type { CuratedProvince } from "@/lib/provinces";
import { buildProvinceTemplateDays } from "@/lib/destination-itinerary";
import { Icon } from "@/components/ui/Icon";

export function TemplateRoutePeek({ province }: { province: CuratedProvince }) {
  const [open, setOpen] = useState(false);
  const days = useMemo(() => buildProvinceTemplateDays(province), [province]);
  const points = days.flatMap((day) => day.stops.map((stop) => ({
    lat: stop.place?.latitude ?? 0,
    lng: stop.place?.longitude ?? 0,
    label: stop.customTitle || stop.place?.name || "Titik",
  }))).filter((point) => point.lat && point.lng);

  const lats = points.map((point) => point.lat);
  const lngs = points.map((point) => point.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const pad = 0.08;
  const project = (lat: number, lng: number) => {
    const x = ((lng - minLng) / Math.max(0.001, maxLng - minLng + pad)) * 220 + 18;
    const y = (1 - (lat - minLat) / Math.max(0.001, maxLat - minLat + pad)) * 120 + 16;
    return { x, y };
  };
  const path = points.map((point, index) => {
    const { x, y } = project(point.lat, point.lng);
    return `${index === 0 ? "M" : "L"}${x} ${y}`;
  }).join(" ");

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="grid h-9 w-9 place-items-center rounded-full border border-primary/15 bg-white text-primary shadow-sm hover:bg-primary hover:text-white"
        aria-label={`Lihat peta rute ${province.name}`}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen(true);
        }}
      >
        <Icon name="map" />
      </button>
      {open && points.length > 0 ? (
        <div className="absolute right-0 top-11 z-30 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <p className="bg-[#004ac6] px-3 py-2 text-[11px] font-extrabold text-white">Peta rute {province.name}</p>
          <svg viewBox="0 0 256 160" className="h-40 w-full bg-[#d7ecff]" aria-hidden="true">
            <rect width="256" height="160" fill="#d7ecff" />
            <path d="M0 110 C40 90 70 130 120 100 S200 70 256 95 L256 160 L0 160 Z" fill="#b7d8f5" />
            <path d={path} fill="none" stroke="#004ac6" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
            {points.map((point, index) => {
              const { x, y } = project(point.lat, point.lng);
              return (
                <g key={`${point.label}-${index}`}>
                  <circle cx={x} cy={y} r="9" fill="#fe893c" />
                  <text x={x} y={y + 3} textAnchor="middle" fontSize="8" fontWeight="800" fill="#fff">{index + 1}</text>
                </g>
              );
            })}
          </svg>
          <div className="max-h-28 space-y-1 overflow-y-auto px-3 py-2">
            {points.slice(0, 6).map((point, index) => (
              <p key={`${point.label}-list-${index}`} className="truncate text-[11px] font-bold text-on-surface">{index + 1}. {point.label}</p>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
