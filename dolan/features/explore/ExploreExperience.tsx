"use client";

import type { ItineraryTemplateSummary, PlaceSummary, TripSummary } from "@dolan/shared";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { GoogleMap, type MapPoint } from "./GoogleMap";
import { PlacePhoto } from "./PlacePhoto";
import { DolanApiError, searchExplore, type ExplorePage, type ExploreSort, type ExploreTab } from "./api";
import { findProvinceForTemplate, provinceDetailHref } from "@/lib/provinces";
import { provinceCoverUrl } from "@/lib/province-cover";

type ExploreItem = PlaceSummary | TripSummary | ItineraryTemplateSummary;
type SheetSnap = "collapsed" | "half" | "expanded";

const categoryFilters = [
  { label: "Semua", value: "" },
  { label: "Pantai", value: "pantai" },
  { label: "Pulau & Bukit", value: "pulau bukit" },
  { label: "Snorkeling", value: "snorkeling" },
  { label: "Sunset", value: "sunset" },
] as const;

const snapHeight: Record<SheetSnap, string> = {
  collapsed: "31%",
  half: "58%",
  expanded: "calc(100% - 0.75rem)",
};

function itemId(item: ExploreItem) {
  return "googlePlaceId" in item ? item.googlePlaceId : item.id;
}

function coverPlace(item: ExploreItem): PlaceSummary | null {
  return "googlePlaceId" in item ? item : item.coverPlace;
}

function tabLabel(tab: ExploreTab) {
  if (tab === "wisata") return "tempat wisata";
  if (tab === "trip") return "trip publik";
  return "template itinerary";
}

function parseExploreTab(value: string | null): ExploreTab | null {
  if (value === "wisata" || value === "trip" || value === "template") return value;
  return null;
}

function matchCategory(query: string) {
  const normalized = query.trim().toLowerCase();
  return categoryFilters.find((item) => item.value && item.value === normalized)?.value ?? "";
}

function tabSort(next: ExploreTab): ExploreSort {
  if (next === "wisata") return "relevance";
  if (next === "trip") return "soonest";
  return "popular";
}

export function ExploreExperience() {
  const searchParams = useSearchParams();
  const urlQuery = (searchParams.get("q") ?? "").trim();
  const urlTab = parseExploreTab(searchParams.get("tab"));
  const initialCategory = urlTab === "wisata" || !urlTab ? matchCategory(urlQuery) : "";
  const [tab, setTab] = useState<ExploreTab>(urlTab ?? "wisata");
  const [draftQuery, setDraftQuery] = useState(urlQuery);
  const [query, setQuery] = useState(initialCategory && initialCategory === urlQuery.toLowerCase() ? "" : urlQuery);
  const [category, setCategory] = useState(initialCategory);
  const [dateFrom, setDateFrom] = useState("");
  const [sort, setSort] = useState<ExploreSort>(tabSort(urlTab ?? "wisata"));
  const [result, setResult] = useState<ExplorePage | null>(null);
  const [items, setItems] = useState<ExploreItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<DolanApiError | null>(null);
  const [sheetSnap, setSheetSnap] = useState<SheetSnap>("half");
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [focusCenter, setFocusCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [pendingMapCenter, setPendingMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [mapType, setMapType] = useState<"roadmap" | "satellite">("roadmap");
  const [zoomCommand, setZoomCommand] = useState<{ id: number; delta: 1 | -1 } | null>(null);
  const dragStartY = useRef<number | null>(null);
  const cardRefs = useRef(new Map<string, HTMLElement>());
  const requestSequence = useRef(0);
  const searchKey = searchParams.toString();

  useEffect(() => {
    const q = (searchParams.get("q") ?? "").trim();
    const nextTab = parseExploreTab(searchParams.get("tab")) ?? "wisata";
    const matched = nextTab === "wisata" ? matchCategory(q) : "";
    setTab(nextTab);
    setDraftQuery(q);
    setQuery(matched && matched === q.toLowerCase() ? "" : q);
    setCategory(matched);
    setSort(tabSort(nextTab));
  }, [searchKey, searchParams]);

  const runSearch = useCallback(async ({ page = 1, append = false }: { page?: number; append?: boolean } = {}) => {
    const sequence = ++requestSequence.current;
    setStatus("loading");
    setError(null);
    try {
      const next = await searchExplore({
        tab,
        query,
        category: tab === "wisata" ? category : undefined,
        sort,
        page,
        dateFrom: tab === "trip" ? dateFrom || undefined : undefined,
        center: tab === "wisata" || (tab === "trip" && sort === "nearest") ? mapCenter : null,
      });
      if (sequence !== requestSequence.current) return;
      setResult(next);
      setItems((current) => (append ? [...current, ...next.items] : next.items));
      if (!append) setSelectedId(next.items[0] ? itemId(next.items[0]) : null);
      setStatus("ready");
    } catch (cause) {
      if (sequence !== requestSequence.current) return;
      setError(cause instanceof DolanApiError ? cause : new DolanApiError("Data belum dapat dimuat.", "UNKNOWN", 0));
      setStatus("error");
    }
  }, [category, dateFrom, mapCenter, query, sort, tab]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void runSearch(), 0);
    return () => {
      window.clearTimeout(timeout);
      requestSequence.current += 1;
    };
  }, [runSearch]);

  const points = useMemo<MapPoint[]>(() => items.flatMap((item) => {
    const place = coverPlace(item);
    return place ? [{ id: itemId(item), label: "googlePlaceId" in item ? item.name : item.title, lat: place.latitude, lng: place.longitude }] : [];
  }), [items]);

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
    cardRefs.current.get(id)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, []);

  function changeTab(next: ExploreTab) {
    setTab(next);
    setCategory("");
    setSort(next === "wisata" ? "relevance" : next === "trip" ? "soonest" : "popular");
  }

  function changeSort(next: ExploreSort) {
    setLocationMessage(null);
    if (next !== "nearest") {
      setSort(next);
      return;
    }
    const fallbackSort: ExploreSort = tab === "trip" ? "soonest" : "relevance";
    if (!navigator.geolocation) {
      setLocationMessage(
        tab === "trip"
          ? "Perangkat ini tidak menyediakan lokasi. Urutan berangkat terdekat tetap digunakan."
          : "Perangkat ini tidak menyediakan lokasi. Urutan relevan tetap digunakan.",
      );
      setSort(fallbackSort);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setMapCenter({ lat: coords.latitude, lng: coords.longitude });
        setSort("nearest");
      },
      () => {
        setSort(fallbackSort);
        setLocationMessage(
          tab === "trip"
            ? "Izin lokasi ditolak. Menampilkan trip berdasarkan tanggal berangkat terdekat."
            : "Izin lokasi ditolak. Kamu tetap bisa mencari berdasarkan nama kota.",
        );
      },
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }

  function onDragEnd(clientY: number) {
    if (dragStartY.current === null) return;
    const delta = clientY - dragStartY.current;
    dragStartY.current = null;
    if (Math.abs(delta) < 38) {
      setSheetSnap((current) => current === "expanded" ? "half" : "expanded");
      return;
    }
    const order: SheetSnap[] = ["collapsed", "half", "expanded"];
    const currentIndex = order.indexOf(sheetSnap);
    const nextIndex = delta < 0 ? currentIndex + 1 : currentIndex - 1;
    setSheetSnap(order[Math.max(0, Math.min(2, nextIndex))]!);
  }

  function focusCurrentLocation() {
    setLocationMessage(null);
    if (!navigator.geolocation) {
      setLocationMessage("Perangkat ini tidak menyediakan lokasi.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => setFocusCenter({ lat: coords.latitude, lng: coords.longitude }),
      () => setLocationMessage("Izin lokasi ditolak. Aktifkan izin lokasi browser untuk melihat posisimu."),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] min-h-[560px] flex-col overflow-hidden bg-surface md:h-[calc(100dvh-4rem)]">
      <div className="relative min-h-0 flex-1">
        <div className="absolute inset-x-4 top-3 z-40 lg:hidden">
          <SearchField draftQuery={draftQuery} onDraftQuery={setDraftQuery} onSubmit={() => setQuery(draftQuery.trim())} compact />
        </div>
        <div className="absolute inset-0 lg:left-[clamp(480px,46vw,640px)]">
          <GoogleMap points={points} selectedId={selectedId} onSelect={handleSelect} onViewportChanged={setPendingMapCenter} mapType={mapType} focusCenter={focusCenter} zoomCommand={zoomCommand} searchOverlay className="h-full w-full" />
          <MapTools mapType={mapType} onMapType={() => setMapType((current) => current === "roadmap" ? "satellite" : "roadmap")} onLocation={focusCurrentLocation} onZoom={(delta) => setZoomCommand({ id: Date.now(), delta })} />
        </div>
        {pendingMapCenter && tab === "wisata" ? <button type="button" onClick={() => { setMapCenter(pendingMapCenter); setPendingMapCenter(null); }} className="absolute left-1/2 top-4 z-20 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-primary/15 bg-white px-4 py-2 type-label text-primary shadow-lg lg:left-[72%]"><Icon name="refresh" className="text-[18px]" /> Cari di area ini</button> : null}

        <aside className="absolute inset-y-0 left-0 z-20 hidden w-[clamp(480px,46vw,640px)] flex-col border-r border-outline-variant/40 bg-white/96 shadow-xl backdrop-blur-xl lg:flex">
          <div className="border-b border-outline-variant/35 bg-gradient-to-br from-white via-[#f8fbff] to-[#fff8f3] px-5 py-4">
            <SearchField draftQuery={draftQuery} onDraftQuery={setDraftQuery} onSubmit={() => setQuery(draftQuery.trim())} />
            <ExploreFilters tab={tab} category={category} dateFrom={dateFrom} sort={sort} onTab={changeTab} onCategory={setCategory} onDateFrom={setDateFrom} onSort={changeSort} />
          </div>
          <ResultHeader tab={tab} total={result?.totalItems ?? 0} />
          <ResultContent tab={tab} items={items} selectedId={selectedId} status={status} error={error} locationMessage={locationMessage} cardRefs={cardRefs} onSelect={handleSelect} onRetry={() => void runSearch()} onLoadMore={() => void runSearch({ page: (result?.page ?? 1) + 1, append: true })} hasNextPage={result?.hasNextPage ?? false} />
        </aside>

        <aside className="absolute inset-x-0 bottom-14 z-30 flex flex-col overflow-hidden rounded-t-[28px] border-t border-white/80 bg-white/97 shadow-[0_-16px_45px_rgba(7,28,50,.18)] backdrop-blur-xl transition-[height] duration-300 ease-out lg:hidden" style={{ height: snapHeight[sheetSnap] }}>
          <button type="button" className="flex w-full touch-none flex-col items-center pb-1 pt-2.5" onPointerDown={(event) => { dragStartY.current = event.clientY; event.currentTarget.setPointerCapture(event.pointerId); }} onPointerUp={(event) => onDragEnd(event.clientY)} onPointerCancel={() => { dragStartY.current = null; }} aria-label="Tarik daftar hasil">
            <span className="h-1 w-11 rounded-full bg-outline-variant" /><span className="mt-1 type-micro text-on-surface-variant">{sheetSnap === "expanded" ? "Tarik turun untuk melihat peta" : "Tarik ke atas untuk melihat daftar"}</span>
          </button>
          <div className="shrink-0 border-b border-outline-variant/30 bg-white px-3 pb-2.5">
            <ExploreFilters tab={tab} category={category} dateFrom={dateFrom} sort={sort} onTab={changeTab} onCategory={setCategory} onDateFrom={setDateFrom} onSort={changeSort} compact />
          </div>
          <ResultHeader tab={tab} total={result?.totalItems ?? 0} compact />
          <ResultContent tab={tab} items={items} selectedId={selectedId} status={status} error={error} locationMessage={locationMessage} cardRefs={cardRefs} onSelect={handleSelect} onRetry={() => void runSearch()} onLoadMore={() => void runSearch({ page: (result?.page ?? 1) + 1, append: true })} hasNextPage={result?.hasNextPage ?? false} />
        </aside>
      </div>
    </div>
  );
}

function SearchField({ draftQuery, onDraftQuery, onSubmit, compact = false }: { draftQuery: string; onDraftQuery: (value: string) => void; onSubmit: () => void; compact?: boolean }) {
  return <form onSubmit={(event) => { event.preventDefault(); onSubmit(); }} className={compact ? "mx-auto max-w-xl" : "w-full"}>
    <label className={`flex items-center gap-2.5 border border-outline-variant/45 bg-surface-container-low shadow-sm transition focus-within:border-primary/35 focus-within:bg-white focus-within:shadow-md ${compact ? "rounded-full py-1.5 pl-4 pr-1.5" : "rounded-2xl py-2 pl-4 pr-2"}`}>
      <Icon name="search" className="text-[21px] text-on-surface-variant" />
      <input value={draftQuery} onChange={(event) => onDraftQuery(event.target.value)} className="type-label min-w-0 flex-1 bg-transparent text-on-surface outline-none" placeholder="Cari wisata, kota, atau trip..." />
      <button type="submit" aria-label="Cari" className={`grid shrink-0 place-items-center rounded-full bg-primary text-white shadow-[0_6px_16px_rgba(0,74,198,.24)] ${compact ? "h-10 w-10" : "h-9 w-9"}`}><Icon name="arrow_forward" className="text-[19px]" /></button>
    </label>
  </form>;
}

type MapToolsProps = {
  mapType: "roadmap" | "satellite";
  onMapType: () => void;
  onLocation: () => void;
  onZoom: (delta: 1 | -1) => void;
};

function MapTools({ mapType, onMapType, onLocation, onZoom }: MapToolsProps) {
  return (
    <>
      <div className="absolute left-3 top-20 z-30 flex items-center rounded-xl border border-outline-variant/35 bg-white/95 p-1 shadow-lg backdrop-blur-md lg:left-4 lg:top-4">
        <span className="flex items-center gap-1.5 px-2 type-caption font-semibold text-on-surface">
          <Icon name="layers" className="text-[17px] text-secondary-container" /> Destinasi di peta
        </span>
      </div>
      <div className="absolute right-3 top-52 z-30 flex flex-col gap-1.5 lg:bottom-6 lg:right-5 lg:top-auto">
        <button type="button" onClick={onMapType} aria-label={mapType === "roadmap" ? "Tampilkan peta satelit" : "Tampilkan peta biasa"} title={mapType === "roadmap" ? "Tampilan satelit" : "Tampilan peta"} className="grid h-11 w-11 place-items-center rounded-xl border border-outline-variant/30 bg-white text-on-surface shadow-lg transition hover:text-primary">
          <Icon name={mapType === "roadmap" ? "layers" : "map"} className="text-[24px]" />
        </button>
        <button type="button" onClick={onLocation} aria-label="Lihat lokasi saya" title="Lokasi saya" className="grid h-11 w-11 place-items-center rounded-xl border border-outline-variant/30 bg-white text-primary shadow-lg transition hover:bg-surface-container"><Icon name="my_location" className="text-[22px]" /></button>
        <div className="overflow-hidden rounded-xl border border-outline-variant/30 bg-white shadow-lg">
          <button type="button" onClick={() => onZoom(1)} aria-label="Perbesar peta" className="grid h-11 w-11 place-items-center text-on-surface transition hover:bg-surface-container"><Icon name="add" className="text-[23px]" /></button>
          <div className="mx-2 h-px bg-outline-variant/45" />
          <button type="button" onClick={() => onZoom(-1)} aria-label="Perkecil peta" className="grid h-11 w-11 place-items-center text-on-surface transition hover:bg-surface-container"><Icon name="remove" className="text-[23px]" /></button>
        </div>
      </div>
    </>
  );
}

type ExploreFiltersProps = {
  tab: ExploreTab;
  category: string;
  dateFrom: string;
  sort: ExploreSort;
  onTab: (tab: ExploreTab) => void;
  onCategory: (category: string) => void;
  onDateFrom: (date: string) => void;
  onSort: (sort: ExploreSort) => void;
  compact?: boolean;
};

function ExploreFilters({ tab, category, dateFrom, sort, onTab, onCategory, onDateFrom, onSort, compact = false }: ExploreFiltersProps) {
  return <div className={compact ? "mt-2 space-y-2" : "mt-3 space-y-2.5"}>
    <div className="flex items-center justify-between gap-2">
      <div className="inline-flex min-w-0 rounded-xl bg-surface-container p-1">
        {(["wisata", "trip", "template"] as const).map((item) => <button key={item} type="button" onClick={() => onTab(item)} className={`type-label shrink-0 rounded-lg px-3 py-1.5 transition ${tab === item ? "bg-white text-primary shadow-sm" : "text-on-surface-variant"}`}>{item === "wisata" ? "Wisata" : item === "trip" ? "Trip" : "Template"}</button>)}
      </div>
      <label className="flex min-w-0 items-center gap-1.5 rounded-xl border border-outline-variant/40 bg-white px-2.5 py-1.5 text-on-surface-variant">
        <Icon name="tune" className="text-[17px]" />
        <select value={sort} onChange={(event) => onSort(event.target.value as ExploreSort)} aria-label="Urutkan hasil" className="max-w-[11rem] bg-transparent type-caption font-semibold text-on-surface outline-none">
          {tab === "wisata" ? <><option value="relevance">Relevan</option><option value="popular">Populer</option><option value="nearest">Terdekat</option></> : tab === "trip" ? <><option value="soonest">Berangkat terdekat</option><option value="popular">Populer</option><option value="nearest">Titik mulai terdekat</option></> : <><option value="recent">Terbaru</option><option value="popular">Populer</option></>}
        </select>
      </label>
    </div>
    {tab === "wisata" ? <div className="flex gap-1.5 overflow-x-auto pb-0.5">{categoryFilters.map((filter) => <button key={filter.label} type="button" onClick={() => onCategory(filter.value)} className={`chip shrink-0 border transition ${category === filter.value ? "border-secondary-container/20 bg-secondary-container text-white" : "border-outline-variant/45 bg-white text-on-surface-variant"}`}>{filter.label}</button>)}</div> : null}
    {tab === "trip" ? <label className="flex items-center gap-2 rounded-xl border border-outline-variant/40 bg-white px-3 py-2"><Icon name="calendar_month" className="text-[18px] text-primary" /><span className="type-caption text-on-surface-variant">Mulai trip</span><input type="date" value={dateFrom} onChange={(event) => onDateFrom(event.target.value)} className="ml-auto min-w-0 bg-transparent type-label text-on-surface outline-none" aria-label="Tanggal mulai trip" /></label> : null}
  </div>;
}

function ResultHeader({ tab, total, compact = false }: { tab: ExploreTab; total: number; compact?: boolean }) {
  return <div className={`border-b border-outline-variant/35 ${compact ? "px-4 py-2" : "px-5 py-3.5"}`}><p className="type-label text-on-surface">{total ? `${total} ${tabLabel(tab)} ditemukan` : `Jelajahi ${tabLabel(tab)}`}</p>{!compact ? <p className="type-caption mt-0.5 text-on-surface-variant">{tab === "wisata" ? "Rating tempat berasal dari Google" : tab === "trip" ? "Join tanpa pembayaran ke host" : "Rute yang bisa disalin dan diedit"}</p> : null}</div>;
}

type ResultContentProps = {
  tab: ExploreTab; items: ExploreItem[]; selectedId: string | null; status: "loading" | "ready" | "error"; error: DolanApiError | null; locationMessage: string | null; cardRefs: React.MutableRefObject<Map<string, HTMLElement>>; onSelect: (id: string) => void; onRetry: () => void; onLoadMore: () => void; hasNextPage: boolean;
};

function ResultContent({ tab, items, selectedId, status, error, locationMessage, cardRefs, onSelect, onRetry, onLoadMore, hasNextPage }: ResultContentProps) {
  if (status === "loading" && items.length === 0) return <LoadingCards />;
  if (status === "error" && items.length === 0) return <StatePanel icon={error?.code === "QUOTA_EXCEEDED" ? "hourglass_empty" : "cloud_off"} title={error?.code === "QUOTA_EXCEEDED" ? "Batas pencarian hari ini tercapai" : "Hasil belum dapat dimuat"} body={error?.message ?? "Periksa koneksi server lalu coba lagi."} action="Coba lagi" onAction={onRetry} />;
  if (status === "ready" && items.length === 0) return <StatePanel icon="travel_explore" title="Belum ada hasil yang cocok" body="Coba nama kota yang lebih umum, ubah filter, atau geser peta ke area lain." action="Muat ulang" onAction={onRetry} />;

  return <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-24 pt-3 md:px-4 lg:pb-5">
    {locationMessage ? <div className="mb-3 flex gap-2 rounded-xl bg-secondary-fixed/70 p-3 type-caption text-on-secondary-container"><Icon name="location_disabled" className="text-[18px]" /><p>{locationMessage}</p></div> : null}
    <div className="space-y-3">{items.map((item) => { const id = itemId(item); return (
      <article key={id} ref={(node) => { if (node) cardRefs.current.set(id, node); else cardRefs.current.delete(id); }} onMouseEnter={() => onSelect(id)} className={`overflow-hidden rounded-2xl border bg-white transition-all ${tab === "trip" ? "p-0" : "p-2.5"} ${selectedId === id ? "border-primary/40 shadow-[0_8px_26px_rgba(0,74,198,.14)] ring-2 ring-primary/8" : "border-outline-variant/45 shadow-sm"}`}>
        {tab === "wisata" && "googlePlaceId" in item ? <PlaceCard place={item} onSelect={() => onSelect(id)} /> : tab === "trip" && "visibility" in item ? <TripCard trip={item} onSelect={() => onSelect(id)} /> : "source" in item ? <TemplateCard template={item} onSelect={() => onSelect(id)} /> : null}
      </article>
    ); })}</div>
    {hasNextPage ? <button type="button" onClick={onLoadMore} disabled={status === "loading"} className="btn-secondary mt-4 w-full">{status === "loading" ? "Memuat..." : "Tampilkan lebih banyak"}</button> : null}
  </div>;
}

function PlaceCard({ place, onSelect }: { place: PlaceSummary; onSelect: () => void }) {
  return <div className="flex gap-3" onClick={onSelect}>
    <PlacePhoto googlePlaceId={place.googlePlaceId} photoName={place.photoName} photoUri={place.photoUri} alt={place.name} className="h-24 w-28 shrink-0 rounded-xl" />
    <div className="min-w-0 flex-1 py-0.5"><div className="flex items-start justify-between gap-2"><div className="min-w-0">{place.visitCount ? <span className="chip mb-1 bg-secondary-fixed text-on-secondary-container">{place.visitCount} trip Dolan</span> : null}<h2 className="type-label-lg line-clamp-2 text-on-surface">{place.name}</h2></div><Icon name="bookmark_border" className="shrink-0 text-[20px] text-on-surface-variant" /></div>
      <p className="mt-1 flex items-center gap-1 type-caption text-on-surface-variant"><Icon name="location_on" className="text-[15px] text-primary" /><span className="line-clamp-1">{place.city ?? place.formattedAddress ?? "Lokasi tersedia di peta"}</span></p>
      <div className="mt-2 flex items-center justify-between gap-2"><span className="type-caption font-semibold text-on-surface"><span className="text-amber-500">★</span> {place.rating?.toFixed(1) ?? "—"} <span className="font-normal text-on-surface-variant">({place.userRatingCount?.toLocaleString("id-ID") ?? 0})</span></span><Link href={`/wisata/${encodeURIComponent(place.googlePlaceId)}`} className="rounded-full bg-primary px-3 py-1.5 type-micro text-white">Lihat detail</Link></div>
    </div>
  </div>;
}

function TripCard({ trip, onSelect }: { trip: TripSummary; onSelect: () => void }) {
  const place = trip.coverPlace;
  return <div onClick={onSelect}>
    <div className="relative h-36 overflow-hidden bg-gradient-to-br from-primary to-tertiary">
      {place ? <PlacePhoto googlePlaceId={place.googlePlaceId} photoName={place.photoName} photoUri={place.photoUri} alt={trip.title} className="absolute inset-0 h-full w-full" /> : <div className="grid h-full place-items-center text-white/80"><Icon name="landscape" className="text-[44px]" /></div>}
      <div className="absolute inset-0 bg-gradient-to-t from-[#071c32]/80 via-transparent to-[#071c32]/20" />
      <div className="absolute inset-x-3 top-3 flex items-center justify-between gap-2"><span className="chip bg-secondary-container text-white shadow-sm">Trip publik</span><span className="chip bg-white/90 text-success shadow-sm">Join gratis</span></div>
      <p className="absolute bottom-3 left-3 flex items-center gap-1.5 type-caption font-semibold text-white"><Icon name="calendar_month" className="text-[16px] text-secondary-fixed" />{formatDateRange(trip.startDate, trip.endDate)}</p>
    </div>
    <div className="p-3.5">
      <p className="flex items-center gap-1 type-caption font-semibold text-primary"><Icon name="location_on" className="text-[16px]" />{trip.destinationCity ?? "Tujuan fleksibel"}</p>
      <h2 className="type-label-lg mt-1 line-clamp-2 text-on-surface">{trip.title}</h2>
      <div className="mt-3 flex items-center justify-between gap-3 border-t border-outline-variant/30 pt-3"><div><p className="type-caption font-semibold text-on-surface">{trip.participantCount} traveler bergabung</p><p className="type-micro text-on-surface-variant">{trip.pendingRequestCount} pengajuan menunggu · biaya masing-masing</p></div><Link href={`/trip/${encodeURIComponent(trip.id)}`} className="shrink-0 rounded-full bg-primary px-4 py-2 type-micro text-white shadow-sm">Lihat trip</Link></div>
    </div>
  </div>;
}

function TemplateCard({ template, onSelect }: { template: ItineraryTemplateSummary; onSelect: () => void }) {
  const province = findProvinceForTemplate({ templateId: template.id, city: template.city });
  const href = provinceDetailHref({ templateId: template.id, city: template.city }) ?? `/buat-trip?templateId=${encodeURIComponent(template.id)}`;
  const cover = province ? provinceCoverUrl(province) : null;
  const place = template.coverPlace;
  return (
    <div className="flex gap-3">
      <Link href={href} className="contents" onClick={onSelect}>
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" className="h-24 w-28 shrink-0 rounded-xl object-cover" />
        ) : place ? (
          <PlacePhoto googlePlaceId={place.googlePlaceId} photoName={place.photoName} photoUri={place.photoUri} alt={template.title} className="h-24 w-28 shrink-0 rounded-xl" />
        ) : (
          <div className="flex h-24 w-28 shrink-0 items-center justify-center rounded-xl bg-tertiary-fixed text-tertiary"><Icon name="route" className="text-[30px]" /></div>
        )}
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={href} className="block" onClick={onSelect}>
          <div className="flex flex-wrap gap-1">
            <span className="chip bg-tertiary-fixed text-tertiary">{template.sourceLabel}</span>
            {template.popularityLabel ? <span className="chip bg-secondary-fixed text-on-secondary-container">{template.popularityLabel}</span> : null}
          </div>
          <h2 className="type-label-lg mt-1 line-clamp-2 text-on-surface">{template.title}</h2>
          <p className="mt-1 type-caption text-on-surface-variant">{template.city} · {template.durationDays} hari</p>
        </Link>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="type-micro text-on-surface-variant">Dipakai {template.usageCount} traveler</span>
          <Link href={`/buat-trip?templateId=${encodeURIComponent(template.id)}`} className="rounded-full bg-primary px-3 py-1.5 type-micro text-white" onClick={onSelect}>
            Pakai rute
          </Link>
        </div>
      </div>
    </div>
  );
}

function LoadingCards() { return <div className="space-y-3 p-4" aria-label="Memuat hasil">{[0, 1, 2, 3].map((item) => <div key={item} className="h-28 animate-pulse rounded-2xl bg-surface-container" />)}</div>; }

function StatePanel({ icon, title, body, action, onAction }: { icon: string; title: string; body: string; action: string; onAction: () => void }) { return <div className="m-auto flex max-w-xs flex-1 flex-col items-center justify-center px-6 py-12 text-center"><span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-fixed text-primary"><Icon name={icon} className="text-[28px]" /></span><h2 className="type-subtitle mt-4 text-on-surface">{title}</h2><p className="type-body mt-2 text-on-surface-variant">{body}</p><button type="button" className="btn-brand mt-5" onClick={onAction}>{action}</button></div>; }

function formatDateRange(start: string | null, end: string | null) {
  if (!start) return "Tanggal belum ditentukan";
  const formatter = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" });
  const first = formatter.format(new Date(`${start}T00:00:00`));
  return !end || end === start ? first : `${first} – ${formatter.format(new Date(`${end}T00:00:00`))}`;
}
