"use client";

import type { ReactNode } from "react";
import { itineraryStopColor } from "@/lib/itinerary-style";

export function ItineraryStopPin({
  index,
  sequence,
  size = 32,
  selected = false,
  shape = "teardrop",
}: {
  index: number;
  sequence?: number;
  size?: number;
  selected?: boolean;
  shape?: "teardrop" | "circle";
}) {
  const color = itineraryStopColor(index);
  const label = String(sequence ?? index + 1);
  if (shape === "circle") {
    return (
      <span
        className="relative z-[1] grid shrink-0 place-items-center rounded-full font-extrabold text-white shadow-sm"
        style={{
          width: size,
          height: size,
          backgroundColor: color,
          boxShadow: selected ? `0 0 0 3px #ffffff, 0 0 0 6px ${color}55` : "0 0 0 3px #ffffff",
          fontSize: Math.round(size * 0.42),
        }}
        aria-hidden="true"
      >
        {label}
      </span>
    );
  }
  const height = Math.round(size * 1.3125);
  return (
    <svg width={size} height={height} viewBox="0 0 32 42" className="relative z-[1] shrink-0 drop-shadow-sm" aria-hidden="true">
      <path
        d="M16 1.5C8.27 1.5 2 7.77 2 15.5 2 26.1 16 40 16 40s14-13.9 14-24.5c0-7.73-6.27-14-14-14Z"
        fill={color}
        stroke="#ffffff"
        strokeWidth={selected ? 3 : 2}
      />
      <circle cx="16" cy="15.2" r="8" fill="white" />
      <text x="16" y="19.6" textAnchor="middle" fontSize="11" fontWeight="800" fontFamily="Arial,sans-serif" fill={color}>
        {label}
      </text>
    </svg>
  );
}

export type ItineraryTimelineItem = {
  id: string;
  index: number;
  sequence?: number;
  title: string;
  meta?: string;
  notes?: string;
  active?: boolean;
  leading?: ReactNode;
  extra?: ReactNode;
};

export function ItineraryTimeline({ items }: { items: ItineraryTimelineItem[] }) {
  return (
    <ol className="space-y-0">
      {items.map((item, position) => (
        <li key={item.id} className="relative flex items-start gap-2 pb-4 last:pb-0">
          {position < items.length - 1 ? (
            <span
              className="absolute bottom-0 top-8 w-0.5"
              style={{ left: item.leading ? "3.15rem" : "0.95rem", backgroundColor: itineraryStopColor(item.index) }}
              aria-hidden="true"
            />
          ) : null}
          {item.leading}
          <ItineraryStopPin index={item.index} sequence={item.sequence} selected={item.active} shape="circle" />
          <div className={`min-w-0 flex-1 rounded-xl px-2 py-1 ${item.active ? "bg-primary-fixed/40" : ""}`}>
            {item.meta ? <p className="type-caption font-bold" style={{ color: itineraryStopColor(item.index) }}>{item.meta}</p> : null}
            <p className="text-sm font-extrabold leading-snug text-on-surface">{item.title}</p>
            {item.notes ? <p className="mt-1 type-caption text-on-surface-variant">{item.notes}</p> : null}
            {item.extra}
          </div>
        </li>
      ))}
    </ol>
  );
}
