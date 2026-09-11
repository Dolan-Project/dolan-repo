"use client";

import Link from "next/link";
import { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Icon } from "@/components/ui/Icon";
import { ASSETS } from "@/lib/assets";
import { ROUTES } from "@/lib/routes";

const trips = [
  {
    title: "Nusa Penida & Manta",
    meta: "14–17 Nov · @wayan_travel · Sisa 2",
    note: "Bagi bensin & tiket",
    category: "Laut",
    cover: ASSETS.nusaPenida,
    href: ROUTES.wisataBali,
  },
  {
    title: "Sunrise Trek Mount Batur",
    meta: "20 Nov · @sinta · Sisa 3",
    note: "Motoran bareng",
    category: "Gunung",
    cover: ASSETS.mountBatur,
    href: ROUTES.wisataBali,
  },
  {
    title: "Sunset & Acoustic Canggu",
    meta: "18 Nov · @dimas_vibes · Sisa 4",
    note: "Santai nongkrong",
    category: "Pantai",
    cover: ASSETS.cangguCampfire,
    href: ROUTES.wisataBali,
  },
] as const;

export default function JelajahPage() {
  const [tab, setTab] = useState<"wisata" | "trip">("trip");
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <AppShell withBottomNavPad={false} showFooter={false}>
      <div className="relative min-h-[calc(100dvh-3.5rem)] md:min-h-[calc(100dvh-4rem)]">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('${ASSETS.mapBali}')` }}
        >
          <div className="absolute inset-0 bg-linear-to-b from-surface/35 via-transparent to-surface/65" />
          <svg
            className="absolute inset-0 h-full w-full opacity-80"
            viewBox="0 0 390 700"
            preserveAspectRatio="none"
            aria-hidden
          >
            <path
              d="M80 180 C140 220, 180 260, 210 320 S280 420, 300 480"
              fill="none"
              stroke="#59cdfe"
              strokeWidth="3"
              strokeDasharray="8 8"
            />
            <path
              d="M120 240 C160 280, 200 300, 240 360"
              fill="none"
              stroke="#006686"
              strokeWidth="2"
              strokeDasharray="4 6"
            />
          </svg>

          <div className="absolute left-[28%] top-[26%]">
            <span className="absolute inset-0 animate-ping rounded-full bg-primary-container/30" />
            <div className="relative flex max-w-44 items-center gap-1.5 rounded-full bg-surface-container-lowest p-1 pr-2.5 shadow-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt=""
                className="h-7 w-7 rounded-full object-cover ring-2 ring-primary-container"
                src={ASSETS.hostWayan}
              />
              <span className="type-micro truncate text-on-surface">
                @wayan · Nusa Penida
              </span>
            </div>
          </div>
          <div className="absolute left-[52%] top-[42%]">
            <div className="relative flex max-w-40 items-center gap-1.5 rounded-full bg-surface-container-lowest p-1 pr-2.5 shadow-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt=""
                className="h-7 w-7 rounded-full object-cover ring-2 ring-tertiary"
                src={ASSETS.hostSinta}
              />
              <span className="type-micro truncate text-on-surface">
                @sinta · Camp Ubud
              </span>
            </div>
          </div>
        </div>

        <div className="relative z-10 mx-auto max-w-300 px-margin pt-3 md:px-margin-desktop md:pt-5">
          <div className="flex gap-2">
            <div className="flex flex-1 items-center gap-2.5 rounded-full bg-surface-container-lowest/95 px-3.5 py-2.5 shadow-lg backdrop-blur-md">
              <Icon name="search" className="text-[20px] text-secondary" />
              <input
                defaultValue="Bali, Indonesia"
                readOnly
                className="type-label w-full bg-transparent text-on-surface focus:outline-none"
                placeholder="Cari wisata atau trip..."
              />
            </div>
            <button
              type="button"
              aria-label="Filter"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface-container-lowest shadow-lg"
            >
              <Icon name="tune" className="text-[20px] text-on-surface-variant" />
            </button>
          </div>

          <div className="mt-2.5 inline-flex rounded-full bg-surface-container-lowest/95 p-1 shadow-md backdrop-blur-md">
            <button
              type="button"
              onClick={() => setTab("wisata")}
              className={`type-label rounded-full px-3.5 py-1.5 transition-colors ${
                tab === "wisata"
                  ? "bg-secondary text-on-secondary"
                  : "text-on-surface-variant"
              }`}
            >
              Wisata
            </button>
            <button
              type="button"
              onClick={() => setTab("trip")}
              className={`type-label inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 transition-colors ${
                tab === "trip"
                  ? "bg-primary-container text-on-primary"
                  : "text-on-surface-variant"
              }`}
            >
              Trip
              <span className="rounded-full bg-white/25 px-1.5 type-micro">
                12
              </span>
            </button>
          </div>
        </div>

        <div className="relative z-10 mx-auto hidden max-w-300 grid-cols-12 gap-5 px-margin-desktop pb-8 pt-5 md:grid">
          <div className="col-span-5 col-start-8 max-h-[calc(100dvh-9rem)] overflow-y-auto rounded-t-3xl bg-surface-container-lowest/95 p-4 shadow-xl backdrop-blur-xl">
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h2 className="type-subtitle text-on-surface">
                  Trip Terbuka Sekitar Bali
                </h2>
                <p className="type-caption text-on-surface-variant">
                  12 Teman Dolan di area ini
                </p>
              </div>
              <Link
                href={ROUTES.wisataBali}
                className="type-label shrink-0 text-secondary"
              >
                Detail Bali
              </Link>
            </div>
            <p className="type-caption mb-3 rounded-xl border border-dashed border-outline-variant bg-surface-container-low px-3 py-2 text-on-surface-variant">
              Join gratis — biaya perjalanan, makan &amp; bensin ditanggung
              masing-masing.
            </p>
            <div className="space-y-2.5">
              {trips.map((trip) => (
                <TripRow key={trip.title} trip={trip} />
              ))}
            </div>
          </div>
        </div>

        <div
          className={`absolute inset-x-0 bottom-0 z-20 md:hidden ${
            sheetOpen ? "top-20" : ""
          }`}
        >
          <div
            className={`rounded-t-3xl bg-surface-container-lowest shadow-[0_-12px_40px_rgba(17,24,39,0.12)] transition-all ${
              sheetOpen ? "h-full overflow-y-auto pb-20" : "pb-16"
            }`}
          >
            <button
              type="button"
              onClick={() => setSheetOpen((v) => !v)}
              className="flex w-full flex-col items-center pt-2.5"
            >
              <span className="mb-1.5 h-1 w-10 rounded-full bg-outline-variant" />
              <span className="type-micro text-on-surface-variant">
                {sheetOpen
                  ? "Tutup daftar"
                  : "Tarik ke atas untuk daftar lengkap"}
              </span>
            </button>

            {!sheetOpen ? (
              <Link
                href={ROUTES.wisataBali}
                className="mx-margin mt-2.5 mb-3 flex gap-3 rounded-2xl border border-outline-variant/50 p-2.5"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt=""
                  className="h-16 w-16 rounded-xl object-cover"
                  src={ASSETS.nusaPenida}
                />
                <div className="min-w-0 flex-1">
                  <span className="chip bg-secondary-fixed text-on-secondary-container">
                    Laut
                  </span>
                  <h3 className="type-label mt-1 truncate text-on-surface">
                    Nusa Penida &amp; Manta
                  </h3>
                  <p className="type-caption text-on-surface-variant">
                    14–17 Nov · Sisa 2
                  </p>
                </div>
              </Link>
            ) : (
              <div className="px-margin pb-3 pt-2">
                <h2 className="type-subtitle text-on-surface">
                  Trip Terbuka Sekitar Bali
                </h2>
                <p className="type-caption mb-3 text-on-surface-variant">
                  12 Teman Dolan di area ini
                </p>
                <div className="space-y-2.5">
                  {trips.map((trip) => (
                    <TripRow key={trip.title} trip={trip} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function TripRow({ trip }: { trip: (typeof trips)[number] }) {
  return (
    <Link
      href={trip.href}
      className="flex gap-2.5 rounded-2xl border border-outline-variant/40 p-2.5 transition-colors hover:bg-surface-container-low"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt=""
        className="h-16 w-16 shrink-0 rounded-xl object-cover"
        src={trip.cover}
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap gap-1">
          <span className="chip bg-secondary-fixed text-on-secondary-container">
            {trip.category}
          </span>
          <span className="chip bg-surface-container text-success">Gratis</span>
        </div>
        <h3 className="type-label mt-1 truncate text-on-surface">
          {trip.title}
        </h3>
        <p className="type-caption truncate text-on-surface-variant">
          {trip.meta}
        </p>
        <p className="type-caption text-on-surface-variant">{trip.note}</p>
        <span className="type-label mt-1 inline-flex text-primary-container">
          Ajukan join
        </span>
      </div>
    </Link>
  );
}
