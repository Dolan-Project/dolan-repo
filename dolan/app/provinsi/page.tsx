import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Icon } from "@/components/ui/Icon";
import { listProvinceCatalog } from "@/lib/provinces";
import { provinceCoverUrl } from "@/lib/province-cover";
import { ROUTES } from "@/lib/routes";

type PageProps = {
  searchParams: Promise<{ q?: string }>;
};

export default async function ProvinsiIndexPage({ searchParams }: PageProps) {
  const { q } = await searchParams;
  const provinces = listProvinceCatalog(q);
  const query = q?.trim() ?? "";

  return (
    <AppShell>
      <main className="min-h-screen bg-surface px-margin pb-20 pt-8 md:px-margin-desktop md:pt-12">
        <section className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] text-white shadow-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-[#075fb8] via-[#118acb] to-[#071c32]" />
          <div className="relative px-6 py-10 md:px-12 md:py-16">
            <p className="type-label font-extrabold uppercase tracking-[.16em] text-white/75">
              Katalog itinerary
            </p>
            <h1 className="mt-3 max-w-3xl text-4xl font-extrabold leading-tight md:text-6xl">
              38 template rute provinsi
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-7 text-white/85 md:text-base">
              Pilih kartu, lihat cover dan durasi kurasi, lalu pakai template langsung ke Buat Trip.
            </p>
            <form action={ROUTES.provinsi} className="mt-7 flex max-w-xl flex-col gap-3 sm:flex-row">
              <label className="sr-only" htmlFor="province-search">
                Cari provinsi
              </label>
              <input
                id="province-search"
                name="q"
                defaultValue={query}
                placeholder="Cari nama atau ibu kota, mis. Bali"
                className="min-h-12 flex-1 rounded-2xl border-0 bg-white/95 px-4 text-sm font-semibold text-on-surface outline-none ring-2 ring-transparent placeholder:font-medium placeholder:text-on-surface-variant focus:ring-white"
              />
              <button
                type="submit"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white px-5 text-sm font-extrabold text-primary"
              >
                <Icon name="search" /> Cari
              </button>
            </form>
          </div>
        </section>

        <section className="mx-auto mt-10 max-w-7xl">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="type-label font-extrabold text-primary">Template resmi</p>
              <h2 className="mt-1 text-2xl font-extrabold text-on-surface md:text-3xl">
                {query ? `${provinces.length} hasil untuk “${query}”` : "Semua 38 provinsi"}
              </h2>
            </div>
            <Link className="font-bold text-primary" href={ROUTES.jelajah}>
              Cari trip publik <Icon name="arrow_forward" />
            </Link>
          </div>

          {provinces.length === 0 ? (
            <div className="mt-8 rounded-[2rem] border border-primary/10 bg-white p-8 text-center shadow-sm">
              <b className="text-lg text-on-surface">Provinsi tidak ditemukan</b>
              <p className="mt-2 text-sm text-on-surface-variant">
                Coba nama seperti Jawa Timur, Papua Barat Daya, atau ibu kota seperti Denpasar.
              </p>
              <Link href={ROUTES.provinsi} className="mt-5 inline-flex font-bold text-primary">
                Lihat semua 38 provinsi
              </Link>
            </div>
          ) : (
            <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {provinces.map((province) => {
                const cover = provinceCoverUrl(province);
                const templateHref = `${ROUTES.buatTrip}?templateId=${encodeURIComponent(province.template.id)}&destination=${encodeURIComponent(province.name)}`;
                return (
                  <article
                    key={province.slug}
                    className="overflow-hidden rounded-[1.75rem] border border-primary/10 bg-white shadow-sm"
                  >
                    <Link href={ROUTES.province(province.slug)} className="relative block h-52 overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={cover} alt="" className="h-full w-full object-cover transition duration-500 hover:scale-[1.04]" />
                      <span className="absolute left-4 top-4 rounded-full bg-black/45 px-3 py-1 text-xs font-bold text-white backdrop-blur">
                        {province.template.durationDays} hari
                      </span>
                      <span className="absolute bottom-4 left-4 rounded-full bg-white/92 px-3 py-1 text-xs font-extrabold text-primary">
                        {province.capital}
                      </span>
                    </Link>
                    <div className="p-5">
                      <p className="type-label font-extrabold text-secondary">{province.name}</p>
                      <h3 className="mt-1 text-xl font-extrabold text-on-surface">{province.template.title}</h3>
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-on-surface-variant">
                        {province.template.durationDays} hari · ibu kota {province.capital}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Link
                          href={ROUTES.province(province.slug)}
                          className="inline-flex items-center gap-1 rounded-xl bg-primary-fixed px-3 py-2 text-xs font-extrabold text-primary"
                        >
                          Lihat template <Icon name="arrow_forward" className="text-[14px]" />
                        </Link>
                        <Link
                          href={templateHref}
                          className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-primary to-[#198ad8] px-3 py-2 text-xs font-extrabold text-white"
                        >
                          Pakai rute <Icon name="add_road" className="text-[14px]" />
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </AppShell>
  );
}
