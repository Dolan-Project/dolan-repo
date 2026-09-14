import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Icon } from "@/components/ui/Icon";
import { INDONESIA_PROVINCES } from "@/lib/provinces";
import { ProvincePlacesGrid } from "@/components/province/ProvincePlacesGrid";

export function generateStaticParams() {
  return INDONESIA_PROVINCES.map(({ slug }) => ({ slug }));
}

type LiveProvince = {
  name: string;
  capital: string;
  description: string;
  places: Array<{
    name: string;
    city: string;
    description?: string;
    googlePlaceId: string | null;
    searchQuery?: string;
  }>;
  template: {
    id: string;
    title: string;
    description: string | null;
    durationDays: number;
    usageCount?: number;
    days: Array<{
      dayNumber: number;
      title: string | null;
      stops: Array<{ customTitle: string | null; notes: string | null }>;
    }>;
  } | null;
};

async function loadProvince(slug: string): Promise<LiveProvince | null> {
  const base = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1").replace(/\/$/, "");
  try {
    const response = await fetch(`${base}/provinces/${encodeURIComponent(slug)}`, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) return null;
    const json = (await response.json()) as { success?: boolean; data?: LiveProvince };
    return json.success && json.data ? json.data : null;
  } catch {
    return null;
  }
}

export default async function ProvincePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const live = await loadProvince(slug);
  const catalog = INDONESIA_PROVINCES.find((item) => item.slug === slug);
  if (!live && !catalog) notFound();

  const name = live?.name ?? catalog!.name;
  const capital = live?.capital ?? catalog!.capital;
  const description = live?.description ?? catalog!.description;
  const places =
    live?.places?.map((place) => ({
      name: place.name,
      city: place.city,
      description: place.description ?? "",
      googlePlaceId: place.googlePlaceId,
      searchQuery: place.searchQuery ?? `${place.name}, ${name}, Indonesia`,
      googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place.name}, ${name}`)}`,
      rank: 0,
    })) ??
    catalog!.places;
  const templateId = live?.template?.id ?? catalog!.template.id;
  const templateTitle = live?.template?.title ?? catalog!.template.title;
  const templateDescription = live?.template?.description ?? catalog!.template.description;
  const durationDays = live?.template?.durationDays ?? catalog!.template.durationDays;
  const usageCount = live?.template?.usageCount ?? 0;
  const dayCards =
    live?.template?.days?.map((day) => ({
      dayNumber: day.dayNumber,
      stops: day.stops.map((stop) => ({
        name: stop.customTitle ?? "Aktivitas",
        notes: stop.notes ?? "",
      })),
    })) ??
    Array.from({ length: catalog!.template.durationDays }, (_, dayIndex) => ({
      dayNumber: dayIndex + 1,
      stops: catalog!.template.stops
        .filter((stop) => stop.day === dayIndex + 1)
        .map((stop) => ({ name: stop.name, notes: stop.notes })),
    }));

  return (
    <AppShell>
      <main className="min-h-screen bg-surface px-margin pb-20 pt-8 md:px-margin-desktop md:pt-12">
        <section className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#075fb8] via-[#118acb] to-[#74d5e8] px-6 py-10 text-white shadow-xl md:px-12 md:py-16">
          <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-white/15 blur-2xl" />
          <p className="type-label relative font-extrabold uppercase tracking-[.16em] text-white/75">
            Jelajah 38 Provinsi
          </p>
          <h1 className="relative mt-3 max-w-3xl text-4xl font-extrabold leading-tight md:text-6xl">
            Petualangan terbaik di {name}
          </h1>
          <p className="relative mt-5 max-w-2xl text-sm leading-7 text-white/85 md:text-base">{description}</p>
          <div className="relative mt-7 flex flex-wrap gap-3 text-sm font-bold">
            <span className="rounded-full bg-white/15 px-4 py-2 backdrop-blur">
              <Icon name="location_on" /> Ibu kota {capital}
            </span>
            <span className="rounded-full bg-white/15 px-4 py-2 backdrop-blur">
              <Icon name="route" /> Template {durationDays} hari
              {usageCount > 0 ? ` · dipakai ${usageCount}x` : ""}
            </span>
          </div>
        </section>

        <section className="mx-auto mt-10 max-w-7xl">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="type-label font-extrabold text-primary">Pilihan DOLAN</p>
              <h2 className="mt-1 text-2xl font-extrabold text-on-surface md:text-3xl">Destinasi unggulan</h2>
            </div>
            <Link className="font-bold text-primary" href={`/jelajah?q=${encodeURIComponent(name)}`}>
              Lihat hasil Google Maps <Icon name="arrow_forward" />
            </Link>
          </div>
          <ProvincePlacesGrid provinceName={name} places={places} />
        </section>

        <section className="mx-auto mt-12 grid max-w-7xl gap-6 rounded-[2rem] border border-primary/10 bg-white p-6 shadow-sm md:grid-cols-[.8fr_1.2fr] md:p-9">
          <div>
            <p className="type-label font-extrabold uppercase tracking-[.13em] text-secondary">
              Template resmi DOLAN
            </p>
            <h2 className="mt-2 text-3xl font-extrabold text-on-surface">{templateTitle}</h2>
            <p className="mt-3 text-sm leading-6 text-on-surface-variant">{templateDescription}</p>
            <div className="mt-5 flex flex-wrap gap-2 text-xs font-bold">
              <span className="rounded-full bg-primary-fixed px-3 py-2">{durationDays} hari</span>
            </div>
            <Link
              href={`/buat-trip?templateId=${encodeURIComponent(templateId)}&destination=${encodeURIComponent(name)}`}
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-[#198ad8] px-5 py-3 text-sm font-extrabold text-white shadow-lg"
            >
              <Icon name="add_road" /> Pakai template ini
            </Link>
          </div>
          <div className="grid gap-3">
            {dayCards.map((day) => (
              <article key={day.dayNumber} className="rounded-2xl bg-surface-container-low p-4">
                <b className="text-sm text-primary">Hari {day.dayNumber}</b>
                <div className="mt-3 grid gap-2">
                  {day.stops.map((stop) => (
                    <div key={`${day.dayNumber}-${stop.name}`} className="flex items-start gap-3 text-sm">
                      <span className="mt-1 h-2.5 w-2.5 flex-none rounded-full bg-secondary" />
                      <span>
                        <strong className="text-on-surface">{stop.name}</strong>
                        {stop.notes ? (
                          <small className="mt-1 block text-on-surface-variant">{stop.notes}</small>
                        ) : null}
                      </span>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </AppShell>
  );
}
