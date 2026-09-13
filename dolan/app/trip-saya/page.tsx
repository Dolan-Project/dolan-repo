"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { ASSETS } from "@/lib/assets";
import { ROUTES } from "@/lib/routes";
import { AttendanceConfirm } from "@/components/trips/AttendanceConfirm";

const created = [
  {
    role: "Host",
    title: "Sailing Liveaboard Phinisi Komodo 4D3N",
    meta: "Titik kumpul: Bandara LBJ · Kuota 4/7",
    date: "24–27 Okt",
    cover: ASSETS.komodo,
  },
] as const;

const joined = [
  {
    role: "Peserta",
    title: "Ekspedisi Rinjani Sembalun – Torean",
    meta: "Host: @rian_mountain",
    date: "10–14 Des",
    cover: ASSETS.mountBatur,
  },
] as const;

type Tab = "dibuat" | "diikuti";

export default function TripSayaPage() {
  const [tab, setTab] = useState<Tab>("dibuat");
  const rows = tab === "dibuat" ? created : joined;

  return (
      <div className="mx-auto max-w-[1240px] px-margin py-6 md:px-margin-desktop md:py-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="type-micro uppercase tracking-wider text-primary">
              Manajemen perjalanan
            </p>
            <h1 className="type-title mt-1 text-on-surface">Trip Saya</h1>
            <p className="type-body mt-1 text-on-surface-variant">
              Trip yang kamu host atau ikuti. Chat &amp; persetujuan join menyusul
              di sprint berikutnya.
            </p>
          </div>
          <Link href={ROUTES.buatTrip} className="btn-primary !min-h-10">
            <Icon name="add" className="text-[18px]" />
            Buat Trip
          </Link>
        </div>

        <div className="mb-4 inline-flex rounded-xl bg-surface-container p-1">
          <button
            type="button"
            onClick={() => setTab("dibuat")}
            className={`type-label rounded-lg px-3.5 py-1.5 ${
              tab === "dibuat"
                ? "bg-surface-container-lowest text-primary shadow-sm"
                : "text-on-surface-variant"
            }`}
          >
            Dibuat ({created.length})
          </button>
          <button
            type="button"
            onClick={() => setTab("diikuti")}
            className={`type-label rounded-lg px-3.5 py-1.5 ${
              tab === "diikuti"
                ? "bg-surface-container-lowest text-primary shadow-sm"
                : "text-on-surface-variant"
            }`}
          >
            Diikuti ({joined.length})
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((trip) => (
            <article key={trip.title} className="card-surface overflow-hidden">
              <div className="aspect-[16/8]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt=""
                  className="h-full w-full object-cover"
                  src={trip.cover}
                />
              </div>
              <div className="p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span
                    className={`chip ${
                      trip.role === "Host"
                        ? "bg-primary text-on-primary"
                        : "bg-primary-fixed text-primary"
                    }`}
                  >
                    Peran: {trip.role}
                  </span>
                  <span className="type-caption text-on-surface-variant">
                    {trip.date}
                  </span>
                </div>
                <h2 className="type-subtitle text-on-surface">{trip.title}</h2>
                <p className="type-caption mt-1 text-on-surface-variant">
                  {trip.meta}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href={ROUTES.itineraryBali}
                    className="btn-brand !min-h-9 !px-4 !text-[0.8125rem]"
                  >
                    Lihat itinerary
                  </Link>
                  <Link
                    href={ROUTES.jelajah}
                    className="btn-ghost !min-h-9 !px-4"
                  >
                    Buka di peta
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
        <AttendanceConfirm />
      </div>
  );
}
