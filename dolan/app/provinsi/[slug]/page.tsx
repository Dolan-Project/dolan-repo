import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Icon } from "@/components/ui/Icon";
import { INDONESIA_PROVINCES } from "@/lib/provinces";
import { ProvincePlacesGrid } from "@/components/province/ProvincePlacesGrid";
import { ProvinceItineraryPanel } from "@/components/province/ProvinceItineraryPanel";
import { buildProvinceTemplateDays } from "@/lib/destination-itinerary";
import { provinceCoverUrl } from "@/lib/province-cover";

export function generateStaticParams() {
  return INDONESIA_PROVINCES.map(({ slug }) => ({ slug }));
}

export default async function ProvincePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const province = INDONESIA_PROVINCES.find((item) => item.slug === slug);
  if (!province) notFound();
  const templateId = province.template.id;
  const days = buildProvinceTemplateDays(province);
  const cover = provinceCoverUrl(province);

  return (
    <AppShell>
      <main className="min-h-screen bg-surface px-margin pb-20 pt-8 md:px-margin-desktop md:pt-12">
        <section className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] text-white shadow-xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-br from-[#075fb8]/90 via-[#118acb]/80 to-[#071c32]/75" />
          <div className="relative px-6 py-10 md:px-12 md:py-16">
            <p className="type-label font-extrabold uppercase tracking-[.16em] text-white/75">Jelajah 38 Provinsi</p>
            <h1 className="mt-3 max-w-3xl text-4xl font-extrabold leading-tight md:text-6xl">Petualangan terbaik di {province.name}</h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-white/85 md:text-base">{province.description}</p>
            <div className="mt-7 flex flex-wrap gap-3 text-sm font-bold">
              <span className="rounded-full bg-white/15 px-4 py-2 backdrop-blur"><Icon name="location_on" /> Ibu kota {province.capital}</span>
              <span className="rounded-full bg-white/15 px-4 py-2 backdrop-blur"><Icon name="route" /> Template {province.template.durationDays} hari</span>
            </div>
          </div>
        </section>

        <section className="mx-auto mt-10 max-w-7xl">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="type-label font-extrabold text-primary">Pilihan DOLAN</p>
              <h2 className="mt-1 text-2xl font-extrabold text-on-surface md:text-3xl">5 destinasi populer</h2>
            </div>
            <Link className="font-bold text-primary" href={`/jelajah?q=${encodeURIComponent(province.name)}`}>Lihat hasil Google Maps <Icon name="arrow_forward" /></Link>
          </div>
          <ProvincePlacesGrid provinceName={province.name} places={province.places} />
        </section>

        <section className="mx-auto mt-12 max-w-7xl rounded-[2rem] border border-primary/10 bg-white p-6 shadow-sm md:p-9">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="type-label font-extrabold uppercase tracking-[.13em] text-secondary">Template resmi DOLAN</p>
              <h2 className="mt-2 text-3xl font-extrabold text-on-surface">{province.template.title}</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-on-surface-variant">{province.template.description}</p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs font-bold">
                <span className="rounded-full bg-primary-fixed px-3 py-2">{province.template.durationDays} hari</span>
                <span className="rounded-full bg-tertiary-fixed px-3 py-2">Rp{province.template.budgetLow.toLocaleString("id-ID")}–Rp{province.template.budgetHigh.toLocaleString("id-ID")}</span>
              </div>
            </div>
            <Link href={`/buat-trip?templateId=${encodeURIComponent(templateId)}&destination=${encodeURIComponent(province.name)}`} className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-[#198ad8] px-5 py-3 text-sm font-extrabold text-white shadow-lg">
              <Icon name="add_road" /> Pakai template ini
            </Link>
          </div>
          <ProvinceItineraryPanel days={days} destination={province.name} />
        </section>
      </main>
    </AppShell>
  );
}
