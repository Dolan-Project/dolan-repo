"use client";

import type { ItineraryTemplateSummary, PlaceDetails, TripSummary } from "@dolan/shared";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { GoogleMap } from "./GoogleMap";
import { PlacePhoto } from "./PlacePhoto";
import { DolanApiError, getPlaceDetails } from "./api";

type DetailData = {
  place: PlaceDetails;
  trips: TripSummary[];
  templates: ItineraryTemplateSummary[];
  relatedUnavailable: boolean;
};

export function PlaceDetailExperience({ googlePlaceId }: { googlePlaceId: string }) {
  const [data, setData] = useState<DetailData | null>(null);
  const [error, setError] = useState<DolanApiError | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      setData(await getPlaceDetails(googlePlaceId, signal));
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") return;
      setError(cause instanceof DolanApiError ? cause : new DolanApiError("Detail wisata belum dapat dimuat.", "UNKNOWN", 0));
    } finally {
      setLoading(false);
    }
  }, [googlePlaceId]);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => void load(controller.signal), 0);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [load]);

  if (loading && !data) return <DetailSkeleton />;
  if (error || !data) return <DetailError error={error} onRetry={() => void load()} />;

  const { place, trips, templates, relatedUnavailable } = data;
  const createHref = `/buat-trip?placeId=${encodeURIComponent(place.googlePlaceId)}&destination=${encodeURIComponent(place.name)}`;
  const point = [{ id: place.googlePlaceId, label: place.name, lat: place.latitude, lng: place.longitude }];

  return (
    <>
      <div className="sticky top-14 z-40 flex items-center gap-2 border-b border-outline-variant/35 bg-white/92 px-margin py-2.5 backdrop-blur-xl md:hidden">
        <Link href="/jelajah" className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-container" aria-label="Kembali"><Icon name="arrow_back" className="text-[19px]" /></Link>
        <p className="type-label min-w-0 flex-1 truncate">{place.name}</p>
        <button type="button" className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-container" aria-label="Simpan"><Icon name="bookmark_border" className="text-[19px]" /></button>
        <button type="button" className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-container" aria-label="Bagikan" onClick={() => void navigator.share?.({ title: place.name, url: window.location.href })}><Icon name="share" className="text-[19px]" /></button>
      </div>

      <main className="mx-auto max-w-[1200px] px-margin pb-28 pt-5 md:px-margin-desktop md:pb-16 md:pt-8">
        <nav className="mb-4 hidden items-center gap-1.5 type-caption text-on-surface-variant md:flex"><Link href="/jelajah" className="hover:text-primary">Jelajah</Link><Icon name="chevron_right" className="text-[16px]" /><span>{place.city ?? "Indonesia"}</span><Icon name="chevron_right" className="text-[16px]" /><span className="text-on-surface">{place.name}</span></nav>

        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              {place.visitCount > 0 ? <span className="chip bg-secondary-fixed text-on-secondary-container">Dikunjungi {place.visitCount} trip Dolan</span> : null}
              {place.types.slice(0, 2).map((type) => <span key={type} className="chip bg-primary-fixed text-primary">{humanizeType(type)}</span>)}
            </div>
            <h1 className="type-display mt-2 text-on-surface">{place.name}</h1>
            <p className="mt-2 flex max-w-3xl items-start gap-1.5 type-body text-on-surface-variant"><Icon name="location_on" className="mt-0.5 shrink-0 text-[18px] text-primary" />{place.formattedAddress ?? place.city ?? "Alamat lengkap belum tersedia"}</p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-outline-variant/40 bg-white px-4 py-3 shadow-sm">
            <span className="text-2xl text-amber-500">★</span><div><p className="type-title leading-none">{place.rating?.toFixed(1) ?? "—"}</p><p className="type-caption text-on-surface-variant">{place.userRatingCount?.toLocaleString("id-ID") ?? 0} ulasan Google</p></div>
          </div>
        </header>

        <section className="mt-6 grid h-[300px] gap-2 overflow-hidden rounded-[24px] md:h-[430px] md:grid-cols-[1.65fr_.7fr]">
          <PlacePhoto googlePlaceId={place.googlePlaceId} photoName={place.photoName} alt={place.name} eager className="h-full min-h-0 rounded-[22px]" />
          <div className="hidden min-h-0 gap-2 md:grid md:grid-rows-2"><PlacePhoto googlePlaceId={place.googlePlaceId} photoName={place.photoName} alt={`${place.name}, tampilan dekat`} eager className="min-h-0 rounded-[20px]" /><div className="relative min-h-0 overflow-hidden rounded-[20px] bg-gradient-to-br from-primary via-tertiary to-secondary-container p-6 text-white"><Icon name="photo_library" className="text-[32px]" /><p className="type-subtitle mt-3">Jelajahi tempatnya, lalu buat rute versimu.</p><p className="type-caption mt-2 text-white/80">Foto disediakan oleh Google Places bila tersedia.</p></div></div>
        </section>
        {place.attributions.length ? <p className="mt-2 type-micro text-on-surface-variant">Atribusi foto: {place.attributions.map((item) => item.uri ? <a key={`${item.displayName}-${item.uri}`} href={item.uri} target="_blank" rel="noreferrer" className="underline">{item.displayName}</a> : <span key={item.displayName}>{item.displayName}</span>).reduce<React.ReactNode[]>((all, item, index) => index ? [...all, ", ", item] : [item], [])}</p> : null}

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.55fr)_360px]">
          <div className="space-y-7">
            <section className="card-surface p-5 md:p-6"><p className="type-micro uppercase tracking-[.12em] text-secondary">Tentang destinasi</p><h2 className="type-title mt-1">Kenali {place.name}</h2><p className="type-body-lg mt-3 text-on-surface-variant">{place.editorialSummary ?? `Informasi editorial untuk ${place.name} belum tersedia dari penyedia. Kamu tetap bisa melihat alamat, rating, jam operasional, peta, serta trip dan itinerary yang terkait.`}</p><div className="mt-5 grid gap-3 sm:grid-cols-3"><Fact icon="star" label="Rating Google" value={place.rating?.toFixed(1) ?? "Belum ada"} /><Fact icon="groups" label="Trip Dolan" value={`${place.visitCount} kunjungan`} /><Fact icon="location_city" label="Area" value={place.city ?? "Indonesia"} /></div></section>

            <section><SectionTitle eyebrow="Jalan bareng" title={`Trip publik ke ${place.name}`} description="Kirim komentar dan kenali host sebelum mengajukan join. Tidak ada pembayaran kepada host." />{trips.length ? <div className="grid gap-3 sm:grid-cols-2">{trips.map((trip) => <RelatedTrip key={trip.id} trip={trip} />)}</div> : <EmptyRelated icon="groups" title="Belum ada trip publik" body="Jadilah traveler pertama yang membuat rencana publik ke tempat ini." action="Buat trip ke sini" href={createHref} />}</section>

            <section><SectionTitle eyebrow="Rute siap pakai" title="Itinerary umum traveler" description="Tambahkan rute ke My Trip lalu edit titik awal, jadwal, dan urutannya." />{templates.length ? <div className="grid gap-3 sm:grid-cols-2">{templates.map((template) => <TemplateCard key={template.id} template={template} />)}</div> : <EmptyRelated icon="route" title="Template belum tersedia" body="Buat itinerary sendiri dengan bantuan AI dari halaman Buat Trip." action="Susun itinerary" href={createHref} />}</section>
            {relatedUnavailable ? <p className="rounded-xl bg-secondary-fixed/60 p-3 type-caption text-on-secondary-container">Sebagian trip atau template belum dapat dimuat. Detail tempat tetap bisa digunakan.</p> : null}
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <section className="card-surface overflow-hidden"><GoogleMap points={point} selectedId={place.googlePlaceId} onSelect={() => undefined} className="h-56 w-full" /><div className="p-4"><h2 className="type-subtitle">Lokasi & akses</h2><p className="type-caption mt-1 text-on-surface-variant">Buka navigasi lengkap dan rute langsung melalui Google Maps.</p>{place.googleMapsUrl ? <a href={place.googleMapsUrl} target="_blank" rel="noreferrer" className="btn-brand mt-4 w-full"><Icon name="map" className="text-[18px]" /> Buka Google Maps</a> : null}</div></section>
            <section className="card-surface p-5"><h2 className="type-subtitle">Jam operasional</h2>{place.weekdayDescriptions?.length ? <ul className="mt-3 space-y-2">{place.weekdayDescriptions.map((line) => <li key={line} className="flex gap-2 type-caption text-on-surface-variant"><Icon name="schedule" className="shrink-0 text-[17px] text-primary" />{line}</li>)}</ul> : <p className="mt-2 type-body text-on-surface-variant">Jam buka belum tersedia. Periksa kembali sebelum berangkat.</p>}</section>
            <Link href={createHref} className="btn-primary hidden w-full md:flex"><Icon name="add_location_alt" className="text-[19px]" /> Buat trip ke sini</Link>
          </aside>
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-14 z-40 border-t border-outline-variant/30 bg-white/95 p-3 pb-safe shadow-[0_-8px_28px_rgba(7,28,50,.12)] backdrop-blur-xl md:hidden"><Link href={createHref} className="btn-primary w-full"><Icon name="add_location_alt" className="text-[19px]" /> Buat trip ke sini</Link></div>
    </>
  );
}

function DetailSkeleton() { return <main className="mx-auto max-w-[1200px] animate-pulse px-margin py-8 md:px-margin-desktop"><div className="h-8 w-2/3 rounded-xl bg-surface-container" /><div className="mt-3 h-4 w-1/2 rounded bg-surface-container" /><div className="mt-7 h-[420px] rounded-[24px] bg-surface-container" /><div className="mt-7 grid gap-5 lg:grid-cols-[1.5fr_360px]"><div className="h-72 rounded-[24px] bg-surface-container" /><div className="h-72 rounded-[24px] bg-surface-container" /></div></main>; }

function DetailError({ error, onRetry }: { error: DolanApiError | null; onRetry: () => void }) { return <main className="mx-auto flex min-h-[65dvh] max-w-md flex-col items-center justify-center px-margin text-center"><span className="flex h-16 w-16 items-center justify-center rounded-full bg-error-container text-error"><Icon name={error?.status === 404 ? "location_off" : "cloud_off"} className="text-[32px]" /></span><h1 className="type-title mt-5">{error?.status === 404 ? "Tempat tidak ditemukan" : "Detail belum dapat dimuat"}</h1><p className="type-body mt-2 text-on-surface-variant">{error?.message ?? "Periksa koneksi server lalu coba lagi."}</p><div className="mt-5 flex gap-2"><Link href="/jelajah" className="btn-secondary">Kembali</Link><button type="button" onClick={onRetry} className="btn-brand">Coba lagi</button></div></main>; }

function Fact({ icon, label, value }: { icon: string; label: string; value: string }) { return <div className="rounded-2xl bg-surface-container-low p-4"><Icon name={icon} className="text-[22px] text-primary" /><p className="type-micro mt-2 text-on-surface-variant">{label}</p><p className="type-label mt-0.5 text-on-surface">{value}</p></div>; }

function SectionTitle({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) { return <div className="mb-3"><p className="type-micro uppercase tracking-[.12em] text-secondary">{eyebrow}</p><h2 className="type-title mt-1">{title}</h2><p className="type-body mt-1 text-on-surface-variant">{description}</p></div>; }

function RelatedTrip({ trip }: { trip: TripSummary }) { return <article className="card-surface overflow-hidden"><div className="flex gap-3 p-3">{trip.coverPlace ? <PlacePhoto googlePlaceId={trip.coverPlace.googlePlaceId} photoName={trip.coverPlace.photoName} alt={trip.title} className="h-24 w-24 shrink-0 rounded-xl" /> : <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl bg-primary-fixed text-primary"><Icon name="groups" className="text-[30px]" /></div>}<div className="min-w-0"><div className="flex gap-1"><span className="chip bg-primary-fixed text-primary">Publik</span><span className="chip bg-emerald-100 text-emerald-700">Join gratis</span></div><h3 className="type-label-lg mt-1 line-clamp-2">{trip.title}</h3><p className="type-caption mt-1 text-on-surface-variant">{trip.destinationCity ?? "Tujuan fleksibel"} · {trip.participantCount} peserta</p></div></div><div className="flex items-center justify-between border-t border-outline-variant/35 px-4 py-2.5"><span className="type-micro text-on-surface-variant">{trip.pendingRequestCount} permintaan join</span><Link href={`/trip/${encodeURIComponent(trip.id)}`} className="type-label text-primary">Lihat & komentar</Link></div></article>; }

function TemplateCard({ template }: { template: ItineraryTemplateSummary }) { return <article className="card-surface p-4"><div className="flex items-start justify-between gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-tertiary-fixed text-tertiary"><Icon name="route" className="text-[22px]" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap gap-1"><span className="chip bg-tertiary-fixed text-tertiary">{template.sourceLabel}</span>{template.popularityLabel ? <span className="chip bg-secondary-fixed text-on-secondary-container">{template.popularityLabel}</span> : null}</div><h3 className="type-label-lg mt-2 line-clamp-2">{template.title}</h3><p className="type-caption mt-1 text-on-surface-variant">{template.durationDays} hari · dipakai {template.usageCount} traveler</p></div></div><Link href={`/buat-trip?templateId=${encodeURIComponent(template.id)}`} className="btn-brand mt-4 w-full !min-h-9">Pakai dan sesuaikan rute</Link></article>; }

function EmptyRelated({ icon, title, body, action, href }: { icon: string; title: string; body: string; action: string; href: string }) { return <div className="rounded-[22px] border border-dashed border-outline-variant bg-white p-6 text-center"><Icon name={icon} className="text-[32px] text-primary" /><h3 className="type-subtitle mt-2">{title}</h3><p className="type-body mt-1 text-on-surface-variant">{body}</p><Link href={href} className="btn-secondary mt-4">{action}</Link></div>; }

function humanizeType(value: string) { return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
