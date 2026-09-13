"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { ASSETS } from "@/lib/assets";
import { ROUTES } from "@/lib/routes";

const wisata = [
  {
    title: "Pulau Padar",
    meta: "Labuan Bajo · 4.9 · Hiking & sunset",
    note: "Spot foto ridge paling ikonik",
    category: "Pulau",
    cover: ASSETS.komodo,
    href: ROUTES.wisataBali,
  },
  {
    title: "Nusa Penida & Manta",
    meta: "Bali · 4.8 · Snorkeling",
    note: "Day trip dari Sanur",
    category: "Laut",
    cover: ASSETS.nusaPenida,
    href: ROUTES.wisataBali,
  },
  {
    title: "Sunrise Trek Mount Batur",
    meta: "Kintamani · 4.7 · Gunung",
    note: "Berangkat jam 02.00",
    category: "Gunung",
    cover: ASSETS.mountBatur,
    href: ROUTES.wisataBali,
  },
] as const;

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

const filters = ["Semua", "🏖️ Pantai", "⛰️ Pulau", "🤿 Snorkeling", "🌅 Sunset"] as const;

export function ExploreView() {
  const [tab, setTab] = useState<"wisata" | "trip">("wisata");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [filter, setFilter] = useState<(typeof filters)[number]>("Semua");

  const rows = useMemo(
    () => (tab === "wisata" ? wisata : trips),
    [tab],
  );

  return (
      <div className="flex min-h-[calc(100dvh-4rem)] flex-col md:min-h-[calc(100dvh-5rem)]">
        <div className="z-20 border-b border-outline-variant/40 bg-surface-container-lowest px-margin py-3 md:px-margin-desktop">
          <div className="mx-auto flex max-w-[1440px] flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 items-center gap-2">
              <div className="flex flex-1 items-center gap-2.5 rounded-xl bg-surface-container-low px-3.5 py-2.5">
                <Icon name="search" className="text-[20px] text-primary" />
                <input
                  defaultValue="Labuan Bajo, NTT"
                  className="type-label w-full bg-transparent text-on-surface focus:outline-none"
                  placeholder="Cari destinasi wisata, kota, atau judul trip..."
                />
              </div>
              <div className="hidden w-48 items-center gap-2 rounded-xl bg-surface-container-low px-3 py-2.5 sm:flex">
                <Icon
                  name="calendar_month"
                  className="text-[18px] text-on-surface-variant"
                />
                <span className="type-label text-on-surface">25–28 Okt</span>
              </div>
              <button
                type="button"
                aria-label="Filter"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-container-low lg:hidden"
              >
                <Icon name="tune" className="text-[20px] text-on-surface-variant" />
              </button>
            </div>

            <div className="inline-flex self-start rounded-xl bg-surface-container p-1">
              <button
                type="button"
                onClick={() => setTab("wisata")}
                className={`type-label rounded-lg px-3.5 py-1.5 transition-colors ${
                  tab === "wisata"
                    ? "bg-surface-container-lowest text-primary shadow-sm"
                    : "text-on-surface-variant"
                }`}
              >
                Wisata
                <span className="ml-1.5 rounded-full bg-primary-fixed px-1.5 type-micro text-primary">
                  14
                </span>
              </button>
              <button
                type="button"
                onClick={() => setTab("trip")}
                className={`type-label inline-flex items-center rounded-lg px-3.5 py-1.5 transition-colors ${
                  tab === "trip"
                    ? "bg-surface-container-lowest text-primary shadow-sm"
                    : "text-on-surface-variant"
                }`}
              >
                Trip Publik
                <span className="ml-1.5 rounded-full bg-surface-container-high px-1.5 type-micro">
                  6
                </span>
              </button>
            </div>
          </div>
          <div className="mx-auto mt-3 flex max-w-[1440px] gap-1.5 overflow-x-auto pb-1">
            {filters.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setFilter(item)}
                className={`chip shrink-0 border ${
                  filter === item
                    ? "border-primary-fixed bg-primary-fixed/40 text-primary"
                    : "border-outline-variant/50 bg-surface-container-lowest text-on-surface-variant"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="relative flex min-h-0 flex-1">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url('${ASSETS.mapBali}')` }}
          >
            <div className="absolute inset-0 bg-linear-to-b from-surface/20 via-transparent to-surface/40" />
            <div className="absolute left-[28%] top-[26%] hidden md:block">
              <span className="absolute inset-0 animate-ping rounded-full bg-primary-container/30" />
              <Link
                href={ROUTES.profilUser("wayan")}
                className="relative flex max-w-44 items-center gap-1.5 rounded-full bg-surface-container-lowest p-1 pr-2.5 shadow-lg"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt=""
                  className="h-7 w-7 rounded-full object-cover ring-2 ring-primary-container"
                  src={ASSETS.hostWayan}
                />
                <span className="type-micro truncate text-on-surface">
                  @wayan · Padar
                </span>
              </Link>
            </div>
          </div>

          <section className="relative z-10 hidden w-[440px] shrink-0 flex-col border-r border-outline-variant/40 bg-surface-container-lowest/95 shadow-sm backdrop-blur-xl lg:flex xl:w-[520px]">
            <div className="border-b border-outline-variant/30 bg-surface-container-low/50 px-5 py-3">
              <p className="type-label text-on-surface">
                {tab === "wisata"
                  ? "Menampilkan 14 tempat wisata"
                  : "6 trip publik terbuka"}
              </p>
              <p className="type-caption text-on-surface-variant">
                Data terverifikasi komunitas · Join gratis
              </p>
            </div>
            <div className="flex-1 space-y-2.5 overflow-y-auto p-4">
              {rows.map((row) => (
                <TripRow key={row.title} trip={row} />
              ))}
            </div>
          </section>

          <div className="relative z-10 flex-1" />

          <div
            className={`absolute inset-x-0 bottom-0 z-20 lg:hidden ${
              sheetOpen ? "top-4" : ""
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
                  {sheetOpen ? "Tutup daftar" : "Tarik ke atas untuk daftar lengkap"}
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
                    src={ASSETS.komodo}
                  />
                  <div className="min-w-0 flex-1">
                    <span className="chip bg-secondary-fixed text-on-secondary-container">
                      Pulau
                    </span>
                    <h3 className="type-label mt-1 truncate text-on-surface">
                      Pulau Padar
                    </h3>
                    <p className="type-caption text-on-surface-variant">
                      Labuan Bajo · Hiking & sunset
                    </p>
                  </div>
                </Link>
              ) : (
                <div className="px-margin pb-3 pt-2">
                  <h2 className="type-subtitle text-on-surface">
                    {tab === "wisata"
                      ? "Wisata sekitar Labuan Bajo"
                      : "Trip terbuka di area ini"}
                  </h2>
                  <div className="mt-3 space-y-2.5">
                    {rows.map((row) => (
                      <TripRow key={row.title} trip={row} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
  );
}

export default function JelajahPage() {
  return <ExploreView />;
}

function TripRow({
  trip,
}: {
  trip: {
    title: string;
    meta: string;
    note: string;
    category: string;
    cover: string;
    href: string;
  };
}) {
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
        <h3 className="type-label mt-1 truncate text-on-surface">{trip.title}</h3>
        <p className="type-caption truncate text-on-surface-variant">{trip.meta}</p>
        <p className="type-caption text-on-surface-variant">{trip.note}</p>
      </div>
    </Link>
  );
}
