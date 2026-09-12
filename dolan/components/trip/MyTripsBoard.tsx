"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import type { ApiError, MyTripRole, TripSummary } from "@/lib/contracts";
import { ASSETS } from "@/lib/assets";
import { ROUTES, tripDetailHref } from "@/lib/routes";

const tabs: { id: MyTripRole; label: string }[] = [
  { id: "hosted", label: "Dibuat" },
  { id: "joined", label: "Diikuti" },
  { id: "pending", label: "Pengajuan" },
];

type SheetPos = "collapsed" | "half" | "expanded";

const CITY_MARKERS: Record<string, { left: string; top: string }> = {
  Yogyakarta: { left: "38%", top: "62%" },
  Lombok: { left: "68%", top: "54%" },
  Karimunjawa: { left: "44%", top: "36%" },
  Bromo: { left: "52%", top: "48%" },
  "Labuan Bajo": { left: "74%", top: "58%" },
  Dieng: { left: "34%", top: "50%" },
};

function markerPos(city: string): { left: string; top: string } {
  const known = CITY_MARKERS[city];
  if (known) return known;
  let hash = 0;
  for (let i = 0; i < city.length; i += 1) {
    hash = (hash + city.charCodeAt(i) * 17) % 100;
  }
  return {
    left: `${18 + (hash % 62)}%`,
    top: `${22 + ((hash * 3) % 48)}%`,
  };
}

function coverFor(city: string) {
  const key = city.toLowerCase();
  if (key.includes("yogya") || key.includes("jogja")) return ASSETS.jogja;
  if (key.includes("lombok") || key.includes("rinjani")) return ASSETS.mountBatur;
  if (key.includes("karimun") || key.includes("penida")) return ASSETS.nusaPenida;
  if (key.includes("bromo") || key.includes("batur")) return ASSETS.mountBatur;
  if (key.includes("komodo") || key.includes("bajo")) return ASSETS.komodo;
  return ASSETS.mapItinerary;
}

function nextSheet(pos: SheetPos): SheetPos {
  if (pos === "collapsed") return "half";
  if (pos === "half") return "expanded";
  return "collapsed";
}

export function MyTripsBoard() {
  const [tab, setTab] = useState<MyTripRole>("hosted");
  const [rows, setRows] = useState<TripSummary[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheet, setSheet] = useState<SheetPos>("collapsed");

  useEffect(() => {
    const ac = new AbortController();
    async function load() {
      setError("");
      setLoading(true);
      setRows([]);
      setSelectedId(null);
      try {
        const response = await fetch(`/api/v1/trips/me?role=${tab}`, {
          credentials: "include",
          signal: ac.signal,
        });
        const json = (await response.json()) as
          | { success: true; data: TripSummary[] }
          | ApiError;
        if (ac.signal.aborted) return;
        if (!json.success) {
          setRows([]);
          setSelectedId(null);
          setError(json.error.message);
          setLoading(false);
          return;
        }
        setRows(json.data);
        setSelectedId(json.data[0]?.id ?? null);
        setLoading(false);
      } catch (err) {
        if (ac.signal.aborted) return;
        setRows([]);
        setSelectedId(null);
        setError(err instanceof Error ? err.message : "Gagal memuat trip");
        setLoading(false);
      }
    }
    void load();
    return () => ac.abort();
  }, [tab]);

  const selected = useMemo(
    () => rows.find((trip) => trip.id === selectedId) ?? rows[0] ?? null,
    [rows, selectedId],
  );

  function selectTrip(id: string) {
    setSelectedId(id);
    setSheet((current) => (current === "expanded" ? "half" : current));
  }

  return (
    <div className="flex min-h-[calc(100dvh-4rem)] flex-col md:min-h-[calc(100dvh-5rem)]">
      <div className="z-20 border-b border-outline-variant/40 bg-surface-container-lowest px-margin py-3 md:px-margin-desktop">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="type-micro uppercase tracking-wider text-primary">
              Manajemen perjalanan
            </p>
            <h1 className="type-title text-on-surface">Trip Saya</h1>
            <p className="type-caption text-on-surface-variant">
              Pilih trip untuk geser marker. Pending ada di Pengajuan, belum peserta.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl bg-surface-container p-1">
              {tabs.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`type-label rounded-lg px-3.5 py-1.5 ${
                    tab === item.id
                      ? "bg-surface-container-lowest text-primary shadow-sm"
                      : "text-on-surface-variant"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <Link href={ROUTES.buatTrip} className="btn-primary !min-h-10">
              <Icon name="add" className="text-[18px]" />
              Buat Trip
            </Link>
          </div>
        </div>
        {error ? (
          <p className="mx-auto mt-2 max-w-[1440px] type-body text-error" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      <div className="relative flex min-h-0 flex-1">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('${ASSETS.mapBali}')` }}
        >
          <div className="absolute inset-0 bg-linear-to-b from-surface/20 via-transparent to-surface/40" />
          {rows.map((trip) => {
            const pos = markerPos(trip.destinationCity);
            const active = trip.id === selected?.id;
            return (
              <button
                key={trip.id}
                type="button"
                onClick={() => selectTrip(trip.id)}
                className="pointer-events-auto absolute z-10 -translate-x-1/2 -translate-y-1/2"
                style={{ left: pos.left, top: pos.top }}
                aria-label={`Pilih ${trip.title}`}
              >
                {active ? (
                  <span className="absolute inset-0 animate-ping rounded-full bg-primary-container/30" />
                ) : null}
                <span
                  className={`relative flex max-w-48 items-center gap-1.5 rounded-full p-1 pr-2.5 shadow-lg ${
                    active
                      ? "bg-primary text-on-primary"
                      : "bg-surface-container-lowest text-on-surface"
                  }`}
                >
                  <span
                    className={`h-7 w-7 rounded-full bg-cover bg-center ring-2 ${
                      active ? "ring-on-primary" : "ring-primary-container"
                    }`}
                    style={{ backgroundImage: `url('${coverFor(trip.destinationCity)}')` }}
                  />
                  <span className="type-micro truncate">
                    {trip.destinationCity || trip.title}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="relative z-10 flex-1 pointer-events-none" />

        <section className="relative z-10 hidden w-[440px] shrink-0 flex-col border-l border-outline-variant/40 bg-surface-container-lowest/95 shadow-sm backdrop-blur-xl lg:flex xl:w-[520px]">
          <div className="border-b border-outline-variant/30 bg-surface-container-low/50 px-5 py-3">
            <p className="type-label text-on-surface">
              {rows.length} trip di tab {tabs.find((item) => item.id === tab)?.label}
            </p>
            <p className="type-caption text-on-surface-variant">
              Peta kiri · daftar kanan · mock marker, bukan Google Places
            </p>
          </div>
          <div className="flex-1 space-y-2.5 overflow-y-auto p-4">
            {loading ? (
              <p className="type-body text-on-surface-variant">Memuat trip…</p>
            ) : null}
            {rows.length === 0 && !error && !loading ? (
              <p className="type-body text-on-surface-variant">Belum ada trip di tab ini.</p>
            ) : null}
            {rows.map((trip) => (
              <TripCard
                key={trip.id}
                trip={trip}
                tab={tab}
                selected={trip.id === selected?.id}
                onSelect={() => selectTrip(trip.id)}
              />
            ))}
          </div>
        </section>

        <div
          className={`absolute inset-x-0 bottom-0 z-20 lg:hidden ${
            sheet === "expanded" ? "top-4" : ""
          }`}
        >
          <div
            className={`rounded-t-3xl bg-surface-container-lowest shadow-[0_-12px_40px_rgba(17,24,39,0.12)] transition-all ${
              sheet === "expanded"
                ? "h-full overflow-y-auto pb-20"
                : sheet === "half"
                  ? "h-[48vh] overflow-y-auto pb-16"
                  : "pb-16"
            }`}
          >
            <button
              type="button"
              onClick={() => setSheet((current) => nextSheet(current))}
              className="flex w-full flex-col items-center pt-2.5"
              aria-label="Ubah tinggi daftar trip"
            >
              <span className="mb-1.5 h-1 w-10 rounded-full bg-outline-variant" />
              <span className="type-micro text-on-surface-variant">
                {sheet === "collapsed"
                  ? "Tarik ke atas untuk daftar"
                  : sheet === "half"
                    ? "Perbesar daftar"
                    : "Tutup daftar"}
              </span>
            </button>

            {sheet === "collapsed" ? (
              selected ? (
                <div className="mx-margin mt-2.5 mb-3">
                  <TripCard
                    trip={selected}
                    tab={tab}
                    selected
                    onSelect={() => selectTrip(selected.id)}
                  />
                </div>
              ) : (
                <p className="mx-margin mb-3 type-body text-on-surface-variant">
                  {loading ? "Memuat trip…" : "Belum ada trip di tab ini."}
                </p>
              )
            ) : (
              <div className="px-margin pb-3 pt-2">
                <h2 className="type-subtitle text-on-surface">
                  {tabs.find((item) => item.id === tab)?.label}
                </h2>
                <div className="mt-3 space-y-2.5">
                  {rows.length === 0 && !error && !loading ? (
                    <p className="type-body text-on-surface-variant">
                      Belum ada trip di tab ini.
                    </p>
                  ) : null}
                  {rows.map((trip) => (
                    <TripCard
                      key={trip.id}
                      trip={trip}
                      tab={tab}
                      selected={trip.id === selected?.id}
                      onSelect={() => selectTrip(trip.id)}
                    />
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

function TripCard({
  trip,
  tab,
  selected,
  onSelect,
}: {
  trip: TripSummary;
  tab: MyTripRole;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <article
      className={`rounded-2xl border p-2.5 transition-colors ${
        selected
          ? "border-primary bg-primary-fixed/30"
          : "border-outline-variant/40 bg-surface-container-lowest hover:bg-surface-container-low"
      }`}
    >
      <button type="button" className="flex w-full gap-2.5 text-left" onClick={onSelect}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt=""
          className="h-16 w-16 shrink-0 rounded-xl object-cover"
          src={coverFor(trip.destinationCity)}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap gap-1">
            <span className="chip bg-surface-container-high text-primary">{trip.status}</span>
            <span className="chip bg-surface-container text-on-surface-variant">
              {trip.visibility}
            </span>
            {tab === "pending" ? (
              <span className="chip bg-secondary-fixed text-on-secondary-container">
                Belum peserta
              </span>
            ) : null}
          </div>
          <h2 className="type-label mt-1 truncate text-on-surface">{trip.title}</h2>
          <p className="type-caption truncate text-on-surface-variant">
            {trip.destinationCity} · {trip.startDate} – {trip.endDate}
          </p>
        </div>
      </button>
      <Link
        href={tripDetailHref(trip.id)}
        className="btn-brand mt-2 !min-h-9 !px-4 !text-[0.8125rem]"
      >
        Buka detail
      </Link>
    </article>
  );
}
