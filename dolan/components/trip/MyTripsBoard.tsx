"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { AttendanceConfirm } from "@/components/trips/AttendanceConfirm";
import { GoogleMap, type MapPoint } from "@/features/explore/GoogleMap";
import type { MyTripRole, MyTripSummary, TripSummary } from "@/lib/contracts";
import { ROUTES, tripDetailHref, tripItineraryPath } from "@/lib/routes";
import { meetingPointFor } from "@/mocks/geo";
import { CITY_ROUTES } from "@/lib/destination-itinerary";
import { ShareRouteModal } from "./ShareRouteModal";
import { JoinRequestsModal } from "./JoinRequestsModal";
import { DeleteTripDialog } from "./DeleteTripDialog";
import { TripCoverImage } from "./TripCoverImage";

type TripListFilter = MyTripRole | "all";
type ListedTrip = MyTripSummary & { listRole: MyTripRole };

const tabs: { id: TripListFilter; label: string }[] = [
  { id: "all", label: "Semua" },
  { id: "hosted", label: "Dibuat" },
  { id: "joined", label: "Diikuti" },
  { id: "pending", label: "Pengajuan" },
];
type SheetPos = "collapsed" | "half" | "expanded";
type MapType = "roadmap" | "satellite";
const noop = () => undefined;

function parseMyTripRows(payload: unknown): { rows: MyTripSummary[]; error?: string } {
  if (!payload || typeof payload !== "object") return { rows: [], error: "Gagal memuat trip" };
  const json = payload as { success?: boolean; data?: unknown; error?: { message?: string } };
  if (!json.success) return { rows: [], error: json.error?.message ?? "Gagal memuat trip" };
  if (Array.isArray(json.data)) return { rows: json.data as MyTripSummary[] };
  if (json.data && typeof json.data === "object" && Array.isArray((json.data as { items?: unknown }).items)) {
    return { rows: (json.data as { items: MyTripSummary[] }).items };
  }
  return { rows: [] };
}

async function loadListedTrips(filter: TripListFilter, signal?: AbortSignal): Promise<{ rows: ListedTrip[]; error?: string }> {
  const roles: MyTripRole[] = filter === "all" ? ["hosted", "joined", "pending"] : [filter];
  const responses = await Promise.all(
    roles.map((role) => fetch(`/api/v1/trips/me?role=${role}`, { credentials: "include", signal })),
  );
  const seen = new Set<string>();
  const rows: ListedTrip[] = [];
  for (let index = 0; index < responses.length; index += 1) {
    const role = roles[index]!;
    const parsed = parseMyTripRows(await responses[index]!.json());
    if (parsed.error) return { rows: [], error: parsed.error };
    for (const trip of parsed.rows) {
      if (seen.has(trip.id)) continue;
      seen.add(trip.id);
      rows.push({ ...trip, listRole: role });
    }
  }
  return { rows };
}

const fallbackRoutes = CITY_ROUTES.map((route) => ({
  match: route.match,
  stops: route.stops.map((stop) => ({ label: stop.name, lat: stop.lat, lng: stop.lng })),
}));

function nextSheet(pos: SheetPos): SheetPos {
  if (pos === "collapsed") return "half";
  if (pos === "half") return "expanded";
  return "collapsed";
}

function tripPoints(trip: TripSummary | null): MapPoint[] {
  if (!trip) return [];
  const points: MapPoint[] = [];
  const searchable = `${trip.destinationCity ?? ""} ${trip.title}`.toLowerCase();
  const route = fallbackRoutes.find((candidate) =>
    candidate.match.some((name) => searchable.includes(name)),
  );
  const pushPoint = (point: MapPoint) => {
    if (
      !points.some(
        (current) =>
          Math.abs(current.lat - point.lat) < 0.00001 &&
          Math.abs(current.lng - point.lng) < 0.00001,
      )
    ) {
      points.push(point);
    }
  };
  const fallback = meetingPointFor(trip.publicMeetingPointLabel, trip.destinationCity);
  const meetingLat = trip.publicMeetingPointLatitude ?? fallback?.latitude;
  const meetingLng = trip.publicMeetingPointLongitude ?? fallback?.longitude;
  const routeAnchor = route?.stops[0];
  const meetingMatchesRoute =
    !routeAnchor ||
    meetingLat == null ||
    meetingLng == null ||
    Math.hypot(meetingLat - routeAnchor.lat, meetingLng - routeAnchor.lng) < 1;
  if (meetingLat != null && meetingLng != null && meetingMatchesRoute) {
    pushPoint({
      id: `${trip.id}-meeting`,
      label: trip.publicMeetingPointLabel ?? "Titik kumpul",
      lat: meetingLat,
      lng: meetingLng,
    });
  }
  if (trip.coverPlace) {
    pushPoint({
      id: `${trip.id}-destination`,
      label: trip.coverPlace.name,
      lat: trip.coverPlace.latitude,
      lng: trip.coverPlace.longitude,
    });
  }
  route?.stops.forEach((stop, index) =>
    pushPoint({ id: `${trip.id}-route-${index}`, ...stop }),
  );
  return points;
}

function mapsRouteUrl(points: MapPoint[]) {
  if (points.length === 0) return "https://www.google.com/maps";
  if (points.length === 1) {
    return `https://www.google.com/maps/search/?api=1&query=${points[0]!.lat},${points[0]!.lng}`;
  }
  const origin = points[0]!;
  const destination = points.at(-1)!;
  const params = new URLSearchParams({
    api: "1",
    origin: `${origin.lat},${origin.lng}`,
    destination: `${destination.lat},${destination.lng}`,
    travelmode: "driving",
  });
  const waypoints = points.slice(1, -1).map((point) => `${point.lat},${point.lng}`).join("|");
  if (waypoints) params.set("waypoints", waypoints);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

function statusLabel(status: TripSummary["status"]) {
  return {
    DRAFT: "Draf",
    OPEN: "Mendatang",
    CLOSED: "Slot ditutup",
    ONGOING: "Berlangsung",
    COMPLETED: "Selesai",
    CANCELLED: "Dibatalkan",
  }[status] ?? status;
}

function dateLabel(start: string | null, end: string | null) {
  if (!start && !end) return "Tanggal fleksibel";
  const formatter = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" });
  const format = (value: string) => formatter.format(new Date(`${value}T00:00:00`));
  if (!start) return format(end!);
  if (!end || start === end) return format(start);
  return `${format(start)} – ${format(end)}`;
}

function durationLabel(start: string | null, end: string | null) {
  if (!start || !end) return null;
  const startMs = new Date(`${start}T00:00:00`).getTime();
  const endMs = new Date(`${end}T00:00:00`).getTime();
  const days = Math.max(1, Math.round((endMs - startMs) / 86_400_000) + 1);
  return `${days}H${Math.max(0, days - 1)}M`;
}

export function MyTripsBoard() {
  const [tab, setTab] = useState<TripListFilter>("all");
  const [rows, setRows] = useState<ListedTrip[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheet, setSheet] = useState<SheetPos>("half");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [visibilityFilter, setVisibilityFilter] = useState("ALL");
  const [query, setQuery] = useState("");
  const [mapType, setMapType] = useState<MapType>("roadmap");
  const [focusCenter, setFocusCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [zoomCommand, setZoomCommand] = useState<{ id: number; delta: 1 | -1 } | null>(null);
  const [notice, setNotice] = useState("");
  const [routePolylines, setRoutePolylines] = useState<string[]>([]);
  const [persistedPoints, setPersistedPoints] = useState<MapPoint[]>([]);
  const [shareTrip, setShareTrip] = useState<MyTripSummary | null>(null);
  const [joinTrip, setJoinTrip] = useState<MyTripSummary | null>(null);
  const [deleteTrip, setDeleteTrip] = useState<MyTripSummary | null>(null);
  const [deleting, setDeleting] = useState(false);
  const dragStart = useRef<number | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    async function load() {
      setError("");
      setLoading(true);
      setRows([]);
      setSelectedId(null);
      try {
        const parsed = await loadListedTrips(tab, ac.signal);
        if (ac.signal.aborted) return;
        if (parsed.error) {
          setError(parsed.error);
          setLoading(false);
          return;
        }
        setRows(parsed.rows);
        setSelectedId(parsed.rows[0]?.id ?? null);
        setLoading(false);
      } catch (err) {
        if (ac.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Gagal memuat trip");
        setLoading(false);
      }
    }
    void load();
    return () => ac.abort();
  }, [tab]);

  const visibleRows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((trip) => {
      if (statusFilter !== "ALL" && trip.status !== statusFilter) return false;
      if (visibilityFilter !== "ALL" && trip.visibility !== visibilityFilter) return false;
      if (!needle) return true;
      const haystack = [trip.title, trip.destinationCity, trip.publicMeetingPointLabel, trip.coverPlace?.name]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [query, rows, statusFilter, visibilityFilter]);
  const selected = useMemo(
    () => visibleRows.find((trip) => trip.id === selectedId) ?? visibleRows[0] ?? null,
    [visibleRows, selectedId],
  );
  const fallbackPoints = useMemo(() => tripPoints(selected), [selected]);
  const points = persistedPoints.length ? persistedPoints : fallbackPoints;

  useEffect(() => {
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPersistedPoints([]); setRoutePolylines([]);
    if (!selected) return () => controller.abort();
    void fetch(`/api/v1/trips/${encodeURIComponent(selected.id)}/route-map`, { credentials: "include", signal: controller.signal })
      .then(async (response) => response.ok ? response.json() : null)
      .then((payload: { data?: { points?: MapPoint[]; polylines?: string[] } } | null) => { if (!controller.signal.aborted) { setPersistedPoints(payload?.data?.points ?? []); setRoutePolylines(payload?.data?.polylines ?? []); } })
      .catch(() => undefined);
    return () => controller.abort();
  }, [selected]);

  useEffect(() => {
    const controller = new AbortController();
    if (routePolylines.length) return () => controller.abort();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRoutePolylines([]);
    if (points.length < 2) return () => controller.abort();
    void fetch("/api/v1/routes/preview", { method: "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ points: points.map(({ lat, lng }) => ({ lat, lng })) }), signal: controller.signal })
      .then(async (response) => response.ok ? response.json() : null)
      .then((payload: { data?: { segments?: Array<{ ok: boolean; encodedPolyline?: string }> } } | null) => {
        if (!controller.signal.aborted) setRoutePolylines(payload?.data?.segments?.filter((segment) => segment.ok && segment.encodedPolyline).map((segment) => segment.encodedPolyline!) ?? []);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [points, routePolylines.length]);

  function changeTab(next: TripListFilter) {
    setTab(next);
    setStatusFilter("ALL");
    setVisibilityFilter("ALL");
    setQuery("");
    setNotice("");
  }
  function selectTrip(id: string) {
    setSelectedId(id);
    setSheet((current) => (current === "expanded" ? "half" : current));
  }
  function locateMe() {
    if (!navigator.geolocation) {
      setNotice("Browser ini belum mendukung lokasi perangkat.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => setFocusCenter({ lat: coords.latitude, lng: coords.longitude }),
      () => setNotice("Lokasi tidak dapat diakses. Periksa izin lokasi browser."),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }
  function endDrag(clientY: number) {
    if (dragStart.current == null) return;
    const delta = clientY - dragStart.current;
    if (delta < -35) setSheet("expanded");
    if (delta > 35) setSheet("collapsed");
    dragStart.current = null;
  }

  return (
    <div className="relative mx-auto w-full max-w-[1440px] md:px-6 md:pb-5 md:pt-5">
      <div className="relative h-dvh overflow-hidden md:h-[calc(100dvh-6.25rem)] md:min-h-[580px] md:rounded-[1.75rem] md:border md:border-outline-variant/60 md:bg-white md:shadow-[0_18px_50px_rgba(22,48,80,.12)] lg:grid lg:h-[calc(100vh-7rem)] lg:min-h-[650px] lg:grid-cols-2">
        <section className="relative h-full min-h-[440px] overflow-hidden md:border-r md:border-outline-variant/50">
          <GoogleMap key={selected?.id ?? tab} points={points} selectedId={points[0]?.id ?? null} onSelect={noop} showRoute={points.length > 1} routePolylines={routePolylines} mapType={mapType} focusCenter={focusCenter} zoomCommand={zoomCommand} className="absolute inset-0 h-full w-full" />
          <form className="absolute inset-x-4 top-3 z-40 md:hidden" onSubmit={(event) => event.preventDefault()}>
            <label className="flex items-center gap-2.5 rounded-full border border-outline-variant/45 bg-white py-1.5 pl-4 pr-1.5 shadow-sm">
              <Icon name="search" className="text-[21px] text-on-surface-variant" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="type-label min-w-0 flex-1 bg-transparent text-on-surface outline-none"
                placeholder="Cari trip atau kota..."
                aria-label="Cari trip"
              />
              <button
                type="button"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary text-white shadow-[0_6px_16px_rgba(0,74,198,.24)]"
                aria-label={query ? "Hapus pencarian" : "Cari trip"}
                onClick={() => {
                  if (query) setQuery("");
                }}
              >
                <Icon name={query ? "close" : "arrow_forward"} className="text-[19px]" />
              </button>
            </label>
          </form>
          <div className="pointer-events-none absolute left-3 right-3 top-3 hidden rounded-2xl border border-white/70 bg-white/90 p-3 shadow-lg backdrop-blur-md md:left-4 md:right-20 md:top-4 md:block md:p-4">
            <p className="type-micro uppercase tracking-wider text-secondary">Rute trip aktif</p>
            <h2 className="type-subtitle mt-1">{selected?.destinationCity ?? "Pilih trip untuk melihat lokasi"}</h2>
            <p className="type-caption mt-1 text-on-surface-variant">
              {points.length > 1 ? `${points.length} titik · garis biru mengikuti jalan Google Maps` : points.length === 1 ? "Lokasi trip aktif · itinerary lengkap akan menambah garis rute" : "Koordinat trip ini belum tersedia"}
            </p>
          </div>
          <div className="absolute bottom-5 right-4 z-10 flex flex-col gap-2">
            <MapControl label={mapType === "roadmap" ? "Tampilkan satelit" : "Tampilkan peta"} icon={mapType === "roadmap" ? "satellite_alt" : "map"} onClick={() => setMapType((value) => (value === "roadmap" ? "satellite" : "roadmap"))} />
            <MapControl label="Lokasi saya" icon="my_location" onClick={locateMe} />
            <div className="overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-black/5">
              <MapControl label="Perbesar" icon="add" squared onClick={() => setZoomCommand({ id: Date.now(), delta: 1 })} />
              <div className="mx-2 h-px bg-outline-variant/60" />
              <MapControl label="Perkecil" icon="remove" squared onClick={() => setZoomCommand({ id: Date.now(), delta: -1 })} />
            </div>
          </div>
          {selected && points.length > 0 ? (
            <a href={mapsRouteUrl(points)} target="_blank" rel="noreferrer" className="absolute bottom-5 left-4 inline-flex items-center gap-2 rounded-full bg-[#071c32] px-4 py-2.5 type-label text-white shadow-xl">
              <Icon name="alt_route" /> Buka di Google Maps
            </a>
          ) : null}
        </section>

        <section className={`absolute inset-x-0 bottom-14 z-20 flex min-h-0 flex-col overflow-hidden rounded-t-[28px] border-t border-white/80 bg-white/97 shadow-[0_-16px_45px_rgba(7,28,50,.18)] backdrop-blur-xl transition-[height] duration-300 md:bottom-0 lg:static lg:z-auto lg:!h-full lg:rounded-none lg:border-0 lg:bg-surface-container-low/70 lg:shadow-none ${sheet === "collapsed" ? "max-lg:h-[31%]" : sheet === "half" ? "max-lg:h-[59%]" : "max-lg:h-[calc(100%-9rem)]"}`}>
          <button type="button" onClick={() => setSheet((current) => nextSheet(current))} onPointerDown={(event) => { dragStart.current = event.clientY; }} onPointerUp={(event) => endDrag(event.clientY)} className="flex w-full touch-none flex-col items-center py-2 lg:hidden" aria-label="Ubah tinggi daftar trip">
            <span className="h-1.5 w-11 rounded-full bg-outline-variant" />
          </button>
          <div className="border-b border-outline-variant/40 px-4 pb-3 lg:px-5 lg:pb-4 lg:pt-4">
            <div className="flex items-center justify-between gap-3">
              <div><h1 className="type-title text-[1.35rem] md:text-[1.55rem]">Trip Saya</h1><p className="type-caption text-on-surface-variant">Pilih card untuk melihat rutenya</p></div>
              <Link href={ROUTES.buatTrip} className="btn-brand !min-h-10 !px-4 !text-xs"><Icon name="add" /> Buat Trip</Link>
            </div>
            <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
              {tabs.map((item) => (
                <button key={item.id} type="button" onClick={() => changeTab(item.id)} className={`min-w-max rounded-full px-3 py-2 type-label transition ${tab === item.id ? "bg-primary text-white shadow-sm" : "border border-outline-variant/60 bg-white text-on-surface-variant hover:border-primary/35 hover:text-primary"}`}>{item.label}</button>
              ))}
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter status trip" className="min-w-max rounded-full border border-outline-variant/60 bg-white px-3 py-2 type-label text-on-surface-variant">
                <option value="ALL">Semua status</option><option value="OPEN">Mendatang</option><option value="DRAFT">Draf</option><option value="ONGOING">Berlangsung</option><option value="COMPLETED">Selesai</option>
              </select>
              <select value={visibilityFilter} onChange={(event) => setVisibilityFilter(event.target.value)} aria-label="Filter visibilitas trip" className="min-w-max rounded-full border border-outline-variant/60 bg-white px-3 py-2 type-label text-on-surface-variant">
                <option value="ALL">Publik & private</option><option value="PUBLIC">Publik</option><option value="PRIVATE">Private</option>
              </select>
            </div>
            {notice ? <p className="mt-2 rounded-xl bg-primary-fixed px-3 py-2 type-caption text-on-primary-fixed" role="status">{notice}</p> : null}
            {error ? <p className="mt-2 type-body text-error" role="alert">{error}</p> : null}
          </div>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-3 pb-28 pt-3 [scrollbar-gutter:stable] md:px-4 md:pb-12 md:pt-3 lg:pb-10">
            {loading ? <p className="type-body text-on-surface-variant">Memuat trip…</p> : null}
            {!loading && !error && visibleRows.length === 0 ? <div className="rounded-2xl bg-white p-8 text-center type-body text-on-surface-variant">Belum ada trip yang cocok dengan filter ini.</div> : null}
            {visibleRows.map((trip) => (
              <TripCard
                key={trip.id}
                trip={trip}
                tab={trip.listRole}
                selected={trip.id === selected?.id}
                onSelect={() => selectTrip(trip.id)}
                onShare={() => setShareTrip(trip)}
                onJoinRequests={() => setJoinTrip(trip)}
                onDelete={trip.listRole === "hosted" ? () => setDeleteTrip(trip) : undefined}
              />
            ))}
          </div>
        </section>
      </div>
      {shareTrip ? (
        <ShareRouteModal tripId={shareTrip.id} tripTitle={shareTrip.title} onClose={() => setShareTrip(null)} />
      ) : null}
      {joinTrip ? (
        <JoinRequestsModal
          tripId={joinTrip.id}
          tripTitle={joinTrip.title}
          onClose={() => setJoinTrip(null)}
          onChanged={() => {
            void loadListedTrips(tab)
              .then((parsed) => {
                if (!parsed.error) setRows(parsed.rows);
              })
              .catch(() => undefined);
          }}
        />
      ) : null}
      {deleteTrip ? (
        <DeleteTripDialog
          tripTitle={deleteTrip.title}
          pending={deleting}
          onCancel={() => setDeleteTrip(null)}
          onConfirm={(reason) => {
            setDeleting(true);
            void fetch(`/api/v1/trips/${encodeURIComponent(deleteTrip.id)}`, {
              method: "DELETE",
              credentials: "include",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ reason }),
            })
              .then(async (response) => {
                const json = (await response.json()) as { success?: boolean; error?: { message?: string } };
                if (!response.ok || !json.success) throw new Error(json.error?.message ?? "Trip gagal dihapus.");
                setRows((current) => current.filter((item) => item.id !== deleteTrip.id));
                setDeleteTrip(null);
                setNotice("Trip dan grup chat sudah dihapus.");
              })
              .catch((reason) => {
                setError(reason instanceof Error ? reason.message : "Trip gagal dihapus.");
              })
              .finally(() => setDeleting(false));
          }}
        />
      ) : null}
    </div>
  );
}

function MapControl({ label, icon, onClick, squared = false }: { label: string; icon: string; onClick: () => void; squared?: boolean }) {
  return <button type="button" onClick={onClick} title={label} aria-label={label} className={`flex h-11 w-11 items-center justify-center bg-white text-[#17324d] shadow-lg transition hover:bg-primary-fixed hover:text-primary ${squared ? "rounded-none shadow-none" : "rounded-xl"}`}><Icon name={icon} className="text-[21px]" /></button>;
}

function TripOptionsMenu({
  tripTitle,
  editHref,
  onDelete,
}: {
  tripTitle: string;
  editHref: string;
  onDelete?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        className="rounded-full bg-surface-container px-3 py-2 type-label"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Opsi trip ${tripTitle}`}
        onClick={() => setOpen((value) => !value)}
      >
        <Icon name="more_horiz" /> Opsi
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute bottom-full left-0 z-30 mb-2 w-52 overflow-hidden rounded-2xl border border-outline-variant/60 bg-white py-1 shadow-[0_14px_34px_rgba(7,28,50,.18)]"
        >
          <Link
            role="menuitem"
            href={editHref}
            className="flex items-center gap-2 px-3 py-2.5 type-label text-on-surface hover:bg-surface-container"
            onClick={() => setOpen(false)}
          >
            <Icon name="edit" /> Edit trip
          </Link>
          {onDelete ? (
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 px-3 py-2.5 type-label text-error hover:bg-error-container"
              onClick={() => {
                setOpen(false);
                onDelete();
              }}
            >
              <Icon name="delete" /> Hapus trip
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function TripCard({
  trip,
  tab,
  selected,
  onSelect,
  onShare,
  onJoinRequests,
  onDelete,
}: {
  trip: MyTripSummary;
  tab: MyTripRole;
  selected: boolean;
  onSelect: () => void;
  onShare: () => void;
  onJoinRequests: () => void;
  onDelete?: () => void;
}) {
  const roleLabel = tab === "hosted" ? "PERAN: HOST (INISIATOR)" : tab === "joined" ? "PERAN: PESERTA" : "PENGAJUAN TERKIRIM";
  const duration = durationLabel(trip.startDate, trip.endDate);
  const meeting = trip.publicMeetingPointLabel ?? trip.destinationCity ?? "Titik kumpul belum ditentukan";
  const memberLimit = trip.maxParticipants ? `${trip.participantCount}/${trip.maxParticipants}` : `${trip.participantCount}`;
  return (
    <article className={`group relative overflow-hidden rounded-[1.15rem] bg-white shadow-sm transition-all duration-200 ${selected ? "ring-2 ring-primary shadow-[0_12px_28px_rgba(37,99,235,.14)]" : "ring-1 ring-outline-variant/60 hover:-translate-y-0.5 hover:ring-2 hover:ring-primary/70 hover:shadow-[0_12px_26px_rgba(37,99,235,.1)]"}`}>
      <span className={`absolute right-0 top-0 z-10 rounded-bl-xl px-2.5 py-1.5 text-[8px] font-extrabold tracking-wide text-white md:text-[9px] ${tab === "hosted" ? "bg-primary" : tab === "joined" ? "bg-teal-600" : "bg-amber-500"}`}>{roleLabel}</span>
      <button type="button" aria-pressed={selected} onClick={onSelect} className="flex w-full cursor-pointer items-start gap-3 px-3 pb-3 pt-6 text-left" aria-label={`Tampilkan lokasi ${trip.title}`}>
        <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-surface-container md:h-24 md:w-28">
          <TripCoverImage
            place={trip.coverPlace}
            destinationCity={trip.destinationCity}
            title={trip.title}
            className="h-full w-full transition duration-300 group-hover:scale-105"
            imgClassName="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
          <span className={`absolute bottom-2 left-2 rounded-lg px-2 py-1 text-[10px] font-bold text-white backdrop-blur ${trip.visibility === "PUBLIC" ? "bg-primary/90" : "bg-[#071c32]/85"}`}>{trip.visibility === "PUBLIC" ? "Publik" : "Private"}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 pr-10 md:pr-20">
            <span className={`chip ${trip.status === "OPEN" ? "bg-emerald-100 text-emerald-800" : trip.status === "CANCELLED" ? "bg-red-100 text-red-700" : "bg-primary-fixed text-primary"}`}>{statusLabel(trip.status)}</span>
            <span className="type-caption text-on-surface-variant">{dateLabel(trip.startDate, trip.endDate)}{duration ? ` (${duration})` : ""}</span>
          </div>
          <h2 className="mt-1.5 line-clamp-2 text-sm font-extrabold leading-snug text-on-surface md:text-base">{trip.title}</h2>
          <p className="mt-1 line-clamp-2 type-caption text-on-surface-variant">Titik kumpul: {meeting} · Kuota {memberLimit} peserta terkonfirmasi</p>
          <div className="mt-2.5 flex items-center justify-between gap-3 border-t border-outline-variant/35 pt-2.5">
            <div className="flex min-w-0 items-center">
              <span className="flex -space-x-2" aria-hidden="true">{["DA", "AG", "CL", "BS"].slice(0, Math.min(4, Math.max(1, trip.participantCount))).map((initials, index) => <span key={`${initials}-${index}`} className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-[9px] font-bold text-white ${["bg-primary", "bg-emerald-600", "bg-violet-500", "bg-amber-500"][index]}`}>{initials}</span>)}</span>
              <span className="ml-3 truncate type-label text-on-surface-variant">{memberLimit} Traveler</span>
            </div>
            {trip.pendingRequestCount > 0 ? <span className="min-w-max rounded-xl border border-secondary/25 px-2.5 py-2 type-label text-secondary"><Icon name="notifications" /> {trip.pendingRequestCount} Pengajuan</span> : null}
          </div>
        </div>
      </button>
      <div className="flex flex-wrap items-center gap-1.5 border-t border-outline-variant/45 px-3 py-2.5">
        {tab === "hosted" && trip.visibility === "PUBLIC" ? (
          <button type="button" className="btn-primary !min-h-9 !px-3 !text-xs" onClick={onJoinRequests}>
            Permintaan gabung {trip.pendingRequestCount ? `(${trip.pendingRequestCount})` : ""}
          </button>
        ) : null}
        {(tab === "hosted" || tab === "joined") ? <Link href={ROUTES.tripChat(trip.id)} className="rounded-full bg-surface-container px-3 py-2 type-label"><Icon name="forum" /> Grup Chat</Link> : null}
        {tab === "hosted" ? (
          <TripOptionsMenu tripTitle={trip.title} editHref={tripItineraryPath(trip.id)} onDelete={onDelete} />
        ) : null}
        {tab === "pending" ? <Link href={tripDetailHref(trip.id)} className="btn-brand !min-h-9 !px-3 !text-xs"><Icon name="forum" /> Buka diskusi publik</Link> : null}
        <div className="ml-auto flex items-center gap-1">
          <button type="button" className="rounded-full px-3 py-2 type-label text-primary hover:bg-primary-fixed" onClick={onShare}>
            <Icon name="share" /> Bagikan rute
          </button>
          <Link href={tripDetailHref(trip.id)} className="rounded-full px-3 py-2 type-label text-primary hover:bg-primary-fixed">Lihat detail</Link>
        </div>
      </div>
      {trip.status === "COMPLETED" ? (
        <AttendanceConfirm
          tripId={trip.id}
          tripTitle={trip.title}
          reviewUsername={null}
        />
      ) : null}
    </article>
  );
}
