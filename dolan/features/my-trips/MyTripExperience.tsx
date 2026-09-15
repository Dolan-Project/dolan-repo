/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { GoogleMap, type MapPoint } from "@/features/explore/GoogleMap";
import { ROUTES, tripItineraryPath } from "@/lib/routes";

type TripSection = "dibuat" | "diikuti" | "pengajuan";
type SheetSize = "collapsed" | "half" | "expanded";
type TripRole = "HOST" | "MEMBER" | "PENDING";
type MyTrip = {
  id: string;
  section: TripSection;
  role: TripRole;
  title: string;
  destination: string;
  date: string;
  duration: string;
  status: string;
  visibility: "PUBLIC" | "PRIVATE";
  imageUrl: string;
  imageAttribution: string;
  meta: string;
  members?: string;
  pendingCount?: number;
  route: Array<{ name: string; lat: number; lng: number }>;
};

const TRIPS: MyTrip[] = [
  {
    id: "komodo-4d3n",
    section: "dibuat",
    role: "HOST",
    title: "Sailing Liveaboard Phinisi Komodo 4D3N",
    destination: "Labuan Bajo & Kepulauan Komodo",
    date: "24–27 Okt 2026",
    duration: "4H3M",
    status: "Mendatang",
    visibility: "PUBLIC",
    imageUrl:
      "https://images.unsplash.com/photo-1571366343168-631c5bcca7a4?auto=format&fit=crop&w=1000&q=86",
    imageAttribution: "Pulau Padar, Taman Nasional Komodo",
    meta: "Titik kumpul: Bandara Komodo (LBJ) · Kuota 4/7 peserta terkonfirmasi",
    members: "4/7 Traveler",
    pendingCount: 2,
    route: [
      { name: "Bandara Komodo", lat: -8.4867, lng: 119.8891 },
      { name: "Pulau Padar", lat: -8.6486, lng: 119.5892 },
      { name: "Pink Beach", lat: -8.6031, lng: 119.5196 },
      { name: "Manta Point", lat: -8.5374, lng: 119.6161 },
    ],
  },
  {
    id: "bromo-3d2n",
    section: "dibuat",
    role: "HOST",
    title: "Roadtrip Jeep Bromo & Madakaripura 3D2N",
    destination: "Bromo, Jawa Timur",
    date: "15–17 Nov 2026",
    duration: "3H2M",
    status: "Draf personal",
    visibility: "PRIVATE",
    imageUrl:
      "https://images.unsplash.com/photo-1588668214407-6ea9a6d8c272?auto=format&fit=crop&w=1000&q=86",
    imageAttribution: "Gunung Bromo, Jawa Timur",
    meta: "Estimasi mandiri Rp950.000/orang",
    route: [
      { name: "Malang", lat: -7.9666, lng: 112.6326 },
      { name: "Penanjakan", lat: -7.9083, lng: 112.9468 },
      { name: "Gunung Bromo", lat: -7.9425, lng: 112.953 },
      { name: "Madakaripura", lat: -7.8538, lng: 113.0064 },
    ],
  },
  {
    id: "rinjani-5d4n",
    section: "diikuti",
    role: "MEMBER",
    title: "Ekspedisi Rinjani Sembalun–Torean",
    destination: "Gunung Rinjani, Lombok",
    date: "10–14 Des 2026",
    duration: "5H4M",
    status: "Diterima host",
    visibility: "PUBLIC",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/e/e5/Mount_Rinjani%2C_Indonesia_%28Unsplash%29.jpg",
    imageAttribution: "Gunung Rinjani, Lombok",
    meta: "Host: @rian_mountain · Titik kumpul Bandara LOP",
    members: "6/8 Traveler",
    route: [
      { name: "Bandara Lombok", lat: -8.7573, lng: 116.2767 },
      { name: "Desa Sembalun", lat: -8.3614, lng: 116.5306 },
      { name: "Plawangan Sembalun", lat: -8.3831, lng: 116.4512 },
      { name: "Danau Segara Anak", lat: -8.4075, lng: 116.4161 },
      { name: "Torean", lat: -8.3046, lng: 116.4017 },
    ],
  },
  {
    id: "ijen-pending",
    section: "pengajuan",
    role: "PENDING",
    title: "Blue Fire Ijen & Baluran Sunrise",
    destination: "Banyuwangi, Jawa Timur",
    date: "8–10 Jan 2027",
    duration: "3H2M",
    status: "Menunggu host",
    visibility: "PUBLIC",
    imageUrl:
      "https://images.unsplash.com/photo-1596402184320-417e7178b2cd?auto=format&fit=crop&w=1000&q=86",
    imageAttribution: "Kawah Ijen, Banyuwangi",
    meta: "Pengajuan dikirim · Kamu masih dapat berdiskusi di halaman publik",
    route: [
      { name: "Stasiun Banyuwangi Kota", lat: -8.2192, lng: 114.3691 },
      { name: "Kawah Ijen", lat: -8.058, lng: 114.242 },
      { name: "Taman Nasional Baluran", lat: -7.8389, lng: 114.3872 },
    ],
  },
];

const noop = () => undefined;
const mapPoints = (trip: MyTrip): MapPoint[] =>
  trip.route.map((point, index) => ({
    id: `${trip.id}-${index}`,
    label: `${index + 1}. ${point.name}`,
    lat: point.lat,
    lng: point.lng,
  }));
function mapsRouteUrl(trip: MyTrip) {
  const [origin, ...rest] = trip.route;
  const destination = rest.at(-1) ?? origin;
  const waypoints = rest
    .slice(0, -1)
    .map((point) => `${point.lat},${point.lng}`)
    .join("|");
  const params = new URLSearchParams({
    api: "1",
    origin: `${origin.lat},${origin.lng}`,
    destination: `${destination.lat},${destination.lng}`,
    travelmode: "driving",
  });
  if (waypoints) params.set("waypoints", waypoints);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function MyTripExperience() {
  const [section, setSection] = useState<TripSection>("dibuat");
  const [selectedId, setSelectedId] = useState("komodo-4d3n");
  const [sheetSize, setSheetSize] = useState<SheetSize>("half");
  const [statusFilter, setStatusFilter] = useState("all");
  const [visibilityFilter, setVisibilityFilter] = useState("all");
  const [mapType, setMapType] = useState<"roadmap" | "satellite">("roadmap");
  const [focusCenter, setFocusCenter] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [zoomCommand, setZoomCommand] = useState<{
    id: number;
    delta: 1 | -1;
  } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const dragStart = useRef<number | null>(null);
  const sectionTrips = TRIPS.filter((trip) => trip.section === section);
  const visibleTrips = sectionTrips.filter(
    (trip) =>
      (statusFilter === "all" ||
        trip.status.toLowerCase().includes(statusFilter)) &&
      (visibilityFilter === "all" || trip.visibility === visibilityFilter)
  );
  const selected = (TRIPS.find(
    (trip) => trip.id === selectedId && trip.section === section
  ) ??
    visibleTrips[0] ??
    sectionTrips[0])!;
  const points = mapPoints(selected);

  const changeSection = (next: TripSection) => {
    setSection(next);
    setStatusFilter("all");
    setVisibilityFilter("all");
    const first = TRIPS.find((trip) => trip.section === next);
    if (first) setSelectedId(first.id);
  };
  const cycleSheet = () =>
    setSheetSize((value) =>
      value === "collapsed"
        ? "half"
        : value === "half"
        ? "expanded"
        : "collapsed"
    );
  const endDrag = (clientY: number) => {
    if (dragStart.current === null) return;
    const delta = clientY - dragStart.current;
    if (delta < -35) setSheetSize("expanded");
    if (delta > 35) setSheetSize("collapsed");
    dragStart.current = null;
  };
  const locateMe = () => {
    if (!navigator.geolocation)
      return setNotice("Browser ini belum mendukung lokasi perangkat.");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) =>
        setFocusCenter({ lat: coords.latitude, lng: coords.longitude }),
      () =>
        setNotice("Lokasi tidak dapat diakses. Periksa izin lokasi browser."),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <div className="relative mx-auto w-full max-w-[1440px] px-3 pb-3 pt-3 md:px-6 md:pb-5 md:pt-5">
      <div className="relative h-[calc(100dvh-6.25rem)] min-h-[580px] overflow-hidden rounded-[1.75rem] border border-outline-variant/60 bg-white shadow-[0_18px_50px_rgba(22,48,80,.12)] lg:grid lg:h-[calc(100vh-7rem)] lg:min-h-[650px] lg:grid-cols-[minmax(420px,.88fr)_minmax(560px,1.12fr)]">
        <section className="relative h-full min-h-[440px] overflow-hidden border-r border-outline-variant/50">
          <GoogleMap
            key={selected.id}
            points={points}
            selectedId={points[0]?.id ?? null}
            onSelect={noop}
            showRoute
            mapType={mapType}
            focusCenter={focusCenter}
            zoomCommand={zoomCommand}
            className="absolute inset-0 h-full w-full"
          />
          <div className="pointer-events-none absolute left-3 right-3 top-3 rounded-2xl border border-white/70 bg-white/90 p-3 shadow-lg backdrop-blur-md md:left-4 md:right-20 md:top-4 md:p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="type-micro uppercase tracking-wider text-secondary">
                  Rute trip aktif
                </p>
                <h2 className="type-subtitle mt-1">{selected.destination}</h2>
                <p className="type-caption mt-1 text-on-surface-variant">
                  {selected.route.length} titik · pilih card untuk mengganti
                  rute
                </p>
              </div>
              <span className="chip bg-emerald-50 text-emerald-800">Aktif</span>
            </div>
          </div>
          <div className="absolute bottom-5 right-4 z-10 flex flex-col gap-2">
            <MapControl
              label={
                mapType === "roadmap" ? "Tampilkan satelit" : "Tampilkan peta"
              }
              icon={mapType === "roadmap" ? "satellite_alt" : "map"}
              onClick={() =>
                setMapType((value) =>
                  value === "roadmap" ? "satellite" : "roadmap"
                )
              }
            />
            <MapControl
              label="Lokasi saya"
              icon="my_location"
              onClick={locateMe}
            />
            <div className="overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-black/5">
              <MapControl
                label="Perbesar"
                icon="add"
                squared
                onClick={() => setZoomCommand({ id: Date.now(), delta: 1 })}
              />
              <div className="mx-2 h-px bg-outline-variant/60" />
              <MapControl
                label="Perkecil"
                icon="remove"
                squared
                onClick={() => setZoomCommand({ id: Date.now(), delta: -1 })}
              />
            </div>
          </div>
          <a
            href={mapsRouteUrl(selected)}
            target="_blank"
            rel="noreferrer"
            className="absolute bottom-5 left-4 inline-flex items-center gap-2 rounded-full bg-[#071c32] px-4 py-2.5 type-label text-white shadow-xl"
          >
            <Icon name="alt_route" /> Buka di Google Maps
          </a>
        </section>

        <section
          className={`absolute inset-x-0 bottom-0 z-20 flex min-h-0 flex-col overflow-hidden rounded-t-[1.75rem] border-t border-outline-variant/60 bg-[#f8faff]/96 shadow-[0_-18px_45px_rgba(7,28,50,.18)] backdrop-blur-xl transition-[height] duration-300 lg:static lg:h-full lg:rounded-none lg:border-0 lg:bg-surface-container-low/70 lg:shadow-none ${
            sheetSize === "collapsed"
              ? "h-[32%]"
              : sheetSize === "half"
              ? "h-[58%]"
              : "h-[88%]"
          }`}
        >
          <button
            type="button"
            onClick={cycleSheet}
            onPointerDown={(event) => {
              dragStart.current = event.clientY;
            }}
            onPointerUp={(event) => endDrag(event.clientY)}
            className="flex w-full touch-none flex-col items-center py-2 lg:hidden"
            aria-label="Ubah tinggi daftar trip"
          >
            <span className="h-1.5 w-11 rounded-full bg-outline-variant" />
          </button>
          <div className="border-b border-outline-variant/40 px-4 pb-3 lg:px-5 lg:pb-4 lg:pt-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h1 className="type-title text-[1.35rem] md:text-[1.55rem]">
                  Trip Saya
                </h1>
                <p className="type-caption text-on-surface-variant">
                  Pilih card untuk melihat rutenya
                </p>
              </div>
              <Link
                href={ROUTES.buatTrip}
                className="btn-brand !min-h-10 !px-4 !text-xs"
              >
                <Icon name="add" /> Buat Trip
              </Link>
            </div>
            <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
              {(
                [
                  ["dibuat", "Dibuat", 2],
                  ["diikuti", "Diikuti", 1],
                  ["pengajuan", "Pengajuan", 1],
                ] as const
              ).map(([key, label, count]) => (
                <button
                  type="button"
                  key={key}
                  onClick={() => changeSection(key)}
                  className={`min-w-max rounded-full px-3 py-2 type-label transition ${
                    section === key
                      ? "bg-primary text-white shadow-sm"
                      : "border border-outline-variant/60 bg-white text-on-surface-variant hover:border-primary/35 hover:text-primary"
                  }`}
                >
                  {label}{" "}
                  <span
                    className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] ${
                      section === key
                        ? "bg-white/20 text-white"
                        : key === "pengajuan"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-primary-fixed text-primary"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              ))}
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                aria-label="Filter status trip"
                className="min-w-max rounded-full border border-outline-variant/60 bg-white px-3 py-2 type-label text-on-surface-variant"
              >
                <option value="all">Semua status</option>
                <option value="mendatang">Mendatang</option>
                <option value="draf">Draf</option>
                <option value="diterima">Diterima</option>
                <option value="menunggu">Menunggu</option>
              </select>
              <select
                value={visibilityFilter}
                onChange={(event) => setVisibilityFilter(event.target.value)}
                aria-label="Filter visibilitas trip"
                className="min-w-max rounded-full border border-outline-variant/60 bg-white px-3 py-2 type-label text-on-surface-variant"
              >
                <option value="all">Publik & private</option>
                <option value="PUBLIC">Publik</option>
                <option value="PRIVATE">Private</option>
              </select>
            </div>
            {notice && (
              <div
                role="status"
                className="mt-2 rounded-xl bg-primary-fixed px-3 py-2 type-caption text-on-primary-fixed"
              >
                {notice}
              </div>
            )}
          </div>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-3 pb-24 pt-3 [scrollbar-gutter:stable] md:px-4 md:pb-10 md:pt-4 lg:pb-8">
            {visibleTrips.map((trip) => (
              <TripCard
                key={trip.id}
                trip={trip}
                selected={trip.id === selected.id}
                onSelect={() => setSelectedId(trip.id)}
                onNotice={setNotice}
              />
            ))}
            {visibleTrips.length === 0 && (
              <div className="rounded-2xl bg-white p-8 text-center type-body text-on-surface-variant">
                Tidak ada trip yang cocok dengan filter ini.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function MapControl({
  label,
  icon,
  onClick,
  squared = false,
}: {
  label: string;
  icon: string;
  onClick: () => void;
  squared?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`flex h-11 w-11 items-center justify-center bg-white text-[#17324d] shadow-lg transition hover:bg-primary-fixed hover:text-primary ${
        squared ? "rounded-none shadow-none" : "rounded-xl"
      }`}
    >
      <Icon name={icon} className="text-[21px]" />
    </button>
  );
}

function TripCard({
  trip,
  selected,
  onSelect,
  onNotice,
}: {
  trip: MyTrip;
  selected: boolean;
  onSelect: () => void;
  onNotice: (text: string) => void;
}) {
  const roleLabel =
    trip.role === "HOST"
      ? "PERAN: HOST (INISIATOR)"
      : trip.role === "MEMBER"
      ? "PERAN: PESERTA"
      : "PENGAJUAN TERKIRIM";
  return (
    <article
      className={`group relative overflow-hidden rounded-[1.35rem] bg-white shadow-sm transition-all duration-200 ${
        selected
          ? "ring-2 ring-primary shadow-[0_14px_35px_rgba(37,99,235,.16)]"
          : "ring-1 ring-outline-variant/60 hover:-translate-y-0.5 hover:ring-2 hover:ring-primary/70 hover:shadow-[0_14px_32px_rgba(37,99,235,.12)]"
      }`}
    >
      <span
        className={`absolute right-0 top-0 z-10 rounded-bl-2xl px-3 py-1.5 text-[9px] font-extrabold tracking-wide text-white md:px-4 md:py-2 md:text-[10px] ${
          trip.role === "HOST"
            ? "bg-primary"
            : trip.role === "MEMBER"
            ? "bg-teal-600"
            : "bg-amber-500"
        }`}
      >
        {roleLabel}
      </span>
      <button
        type="button"
        aria-pressed={selected}
        onClick={onSelect}
        className="flex w-full cursor-pointer items-start gap-3 px-3 pb-5 pt-7 text-left md:gap-4"
        aria-label={`Tampilkan rute ${trip.title}`}
      >
        <div className="relative h-24 w-28 shrink-0 overflow-hidden rounded-2xl bg-surface-container md:h-28 md:w-36">
          <img
            src={trip.imageUrl}
            alt={trip.imageAttribution}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
          <span
            className={`absolute bottom-2 left-2 rounded-lg px-2 py-1 text-[10px] font-bold text-white backdrop-blur ${
              trip.visibility === "PUBLIC" ? "bg-primary/90" : "bg-[#071c32]/85"
            }`}
          >
            {trip.visibility === "PUBLIC" ? "Publik" : "Private"}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`chip ${
                trip.status === "Mendatang"
                  ? "bg-emerald-100 text-emerald-800"
                  : trip.role === "PENDING"
                  ? "bg-amber-100 text-amber-800"
                  : "bg-primary-fixed text-primary"
              }`}
            >
              {trip.status}
            </span>
            <span className="type-caption text-on-surface-variant">
              {trip.date} ({trip.duration})
            </span>
          </div>
          <h3 className="mt-2 line-clamp-2 text-base font-extrabold leading-snug text-on-surface md:text-lg">
            {trip.title}
          </h3>
          <p className="mt-1 line-clamp-2 type-caption text-on-surface-variant">
            {trip.meta}
          </p>
          {(trip.members || trip.pendingCount) && (
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-outline-variant/35 pt-3">
              {trip.members ? (
                <div className="flex items-center">
                  <span className="flex -space-x-2">
                    {["DA", "AG", "CL", "BS"].map((initials, index) => (
                      <span
                        key={initials}
                        className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-[9px] font-bold text-white ${
                          [
                            "bg-primary",
                            "bg-emerald-600",
                            "bg-violet-500",
                            "bg-amber-500",
                          ][index]
                        }`}
                      >
                        {initials}
                      </span>
                    ))}
                  </span>
                  <span className="ml-3 type-label text-on-surface-variant">
                    {trip.members}
                  </span>
                </div>
              ) : (
                <span />
              )}
              {trip.pendingCount ? (
                <span className="min-w-max rounded-xl border border-secondary/25 px-3 py-2 type-label text-secondary">
                  <Icon name="notifications" /> {trip.pendingCount} Pengajuan
                  Menunggu
                </span>
              ) : null}
            </div>
          )}
        </div>
      </button>
      <div className="flex flex-wrap items-center gap-2 border-t border-outline-variant/45 px-3 py-4">
        {trip.role === "HOST" && trip.visibility === "PUBLIC" && (
          <button
            type="button"
            onClick={() =>
              onNotice(
                "Panel pengajuan akan terhubung ke API membership milik Wira."
              )
            }
            className="btn-primary !min-h-9 !px-3 !text-xs"
          >
            Kelola Pengajuan {trip.pendingCount ? `(${trip.pendingCount})` : ""}
          </button>
        )}
        {trip.visibility === "PUBLIC" && trip.role !== "PENDING" && (
          <Link href={ROUTES.tripChat(trip.id)} className="rounded-full bg-surface-container px-3 py-2 type-label">
            <Icon name="forum" /> Grup Chat
          </Link>
        )}
        {trip.role === "HOST" && trip.id === "komodo-4d3n" && (
          <Link
            href={tripItineraryPath(trip.id)}
            className="rounded-full bg-surface-container px-3 py-2 type-label"
          >
            <Icon name="edit" /> Edit itinerary
          </Link>
        )}
        {trip.role === "PENDING" && (
          <button
            type="button"
            onClick={() =>
              onNotice(
                "Membuka detail trip publik untuk melanjutkan komentar dengan host."
              )
            }
            className="btn-brand !min-h-9 !px-3 !text-xs"
          >
            <Icon name="forum" /> Buka diskusi publik
          </button>
        )}
        <button
          type="button"
          onClick={() =>
            onNotice(
              "PDF akan memakai itinerary version yang aktif setelah endpoint PDF tersedia."
            )
          }
          className="rounded-full px-3 py-2 type-label text-primary hover:bg-primary-fixed"
        >
          Unduh PDF
        </button>
        <a
          href={mapsRouteUrl(trip)}
          target="_blank"
          rel="noreferrer"
          className="rounded-full px-3 py-2 type-label text-primary hover:bg-primary-fixed"
        >
          <Icon name="share" /> Bagikan rute
        </a>
      </div>
    </article>
  );
}
