"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { ASSETS } from "@/lib/assets";
import { ROUTES } from "@/lib/routes";

const created = [
  {
    role: "Host",
    title: "Sailing Liveaboard Phinisi Komodo 4D3N",
    meta: "Titik kumpul: Bandara LBJ · Kuota 4/7",
    date: "24–27 Okt",
    cover: ASSETS.komodo,
    href: ROUTES.trip("trip_host"),
  },
] as const;

const joined = [
  {
    role: "Peserta",
    title: "Ekspedisi Rinjani Sembalun – Torean",
    meta: "Host: @rian_mountain",
    date: "10–14 Des",
    cover: ASSETS.mountBatur,
    href: ROUTES.trip("trip_1"),
  },
] as const;

const pending = [
  {
    role: "Pengajuan",
    title: "Santai Sore & Sunset Canggu",
    meta: "Menunggu keputusan host · Join gratis",
    date: "12–14 Okt",
    cover: ASSETS.cangguCampfire,
    href: ROUTES.trip("trip_1"),
  },
] as const;

type Tab = "dibuat" | "diikuti" | "pengajuan";

export default function TripSayaPage() {
  const [tab, setTab] = useState<Tab>("dibuat");
  const rows = tab === "dibuat" ? created : tab === "diikuti" ? joined : pending;

  return (
    <div className="mx-auto max-w-[1240px] px-margin py-6 md:px-margin-desktop md:py-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="type-micro uppercase tracking-wider text-primary">
            Manajemen perjalanan
          </p>
          <h1 className="type-title mt-1 text-on-surface">Trip Saya</h1>
          <p className="type-body mt-1 text-on-surface-variant">
            Trip yang kamu host, ikuti, atau ajukan. Keputusan host terlihat di detail trip.
          </p>
        </div>
        <Link href={ROUTES.buatTrip} className="btn-primary !min-h-10">
          <Icon name="add" className="text-[18px]" />
          Buat Trip
        </Link>
      </div>

      <div className="mb-4 inline-flex rounded-xl bg-surface-container p-1">
        {(
          [
            ["dibuat", `Dibuat (${created.length})`],
            ["diikuti", `Diikuti (${joined.length})`],
            ["pengajuan", `Pengajuan (${pending.length})`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`type-label rounded-lg px-3.5 py-1.5 ${
              tab === key
                ? "bg-surface-container-lowest text-primary shadow-sm"
                : "text-on-surface-variant"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {rows.map((trip) => (
          <article key={trip.title} className="card-surface overflow-hidden">
            <div className="aspect-[16/8]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img alt="" className="h-full w-full object-cover" src={trip.cover} />
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
                <span className="type-caption text-on-surface-variant">{trip.date}</span>
              </div>
              <h2 className="type-subtitle text-on-surface">{trip.title}</h2>
              <p className="type-caption mt-1 text-on-surface-variant">{trip.meta}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href={trip.href} className="btn-brand !min-h-9 !px-4 !text-[0.8125rem]">
                  Buka trip
                </Link>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
