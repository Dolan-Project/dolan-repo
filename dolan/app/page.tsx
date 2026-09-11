import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Icon } from "@/components/ui/Icon";
import { ASSETS } from "@/lib/assets";
import { ROUTES } from "@/lib/routes";

const features = [
  {
    title: "Cari wisata",
    desc: "Ratusan hidden gems dan spot otentik kurasi komunitas lokal.",
    icon: "explore",
    tone: "bg-primary-fixed/30 hover:bg-primary-fixed/60",
    iconTone: "bg-primary-container text-on-primary",
    href: ROUTES.jelajah,
  },
  {
    title: "Buat itinerary",
    desc: "Susun rute perjalanan santai tanpa ribet hitungan tiket.",
    icon: "alt_route",
    tone: "bg-secondary-fixed/40 hover:bg-secondary-fixed/70",
    iconTone: "bg-secondary text-on-secondary",
    href: ROUTES.itineraryBali,
  },
  {
    title: "Temukan teman trip",
    desc: "Cocokkan vibe, tujuan, serta tanggal jalan favoritmu.",
    icon: "group_add",
    tone: "bg-tertiary-fixed/40 hover:bg-tertiary-fixed/70",
    iconTone: "bg-tertiary text-on-tertiary",
    href: ROUTES.jelajah,
  },
  {
    title: "Chat & berangkat bareng",
    desc: "Grup chat instan, koordinasi titik kumpul, dan gas bareng.",
    icon: "forum",
    tone: "bg-surface-container-high hover:bg-surface-container-highest",
    iconTone: "bg-on-surface text-surface-container-lowest",
    href: ROUTES.tripSaya,
  },
] as const;

const trips = [
  {
    title: "Sailing Komodo 4H3M",
    place: "Labuan Bajo",
    date: "22–25 Okt",
    seats: "Sisa 3 kursi",
    cover: ASSETS.komodo,
    href: ROUTES.jelajah,
  },
  {
    title: "Jogja Heritage Roadtrip",
    place: "Yogyakarta",
    date: "1–3 Nov",
    seats: "Sisa 2 kursi",
    cover: ASSETS.jogja,
    href: ROUTES.jelajah,
  },
  {
    title: "Canggu → Ubud Slow Travel",
    place: "Bali",
    date: "8–12 Nov",
    seats: "Sisa 4 kursi",
    cover: ASSETS.cangguUbud,
    href: ROUTES.wisataBali,
  },
] as const;

export default function BerandaPage() {
  return (
    <AppShell>
      <section className="relative -mt-16 overflow-hidden bg-gradient-to-b from-[#E0F7FE] via-[#7DD3FC]/80 to-surface pb-10 pt-20 text-on-surface md:-mt-20 md:pb-16 md:pt-24">
        <div className="pointer-events-none absolute -left-16 -top-10 h-64 w-64 rounded-full bg-white/50 blur-3xl md:h-96 md:w-96" />
        <div className="pointer-events-none absolute right-0 top-1/4 h-72 w-72 rounded-full bg-secondary-fixed/40 blur-3xl md:h-[420px] md:w-[420px]" />

        <div className="relative z-10 mx-auto w-full max-w-[1200px] px-margin md:px-margin-desktop">
          {/* Mobile hero */}
          <div className="flex items-center gap-3 md:hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt="Globe"
              className="-ml-6 h-28 w-28 shrink-0 object-contain drop-shadow-xl"
              src={ASSETS.globe}
            />
            <div className="min-w-0 flex-1">
              <h1 className="type-display text-on-background">
                Yuk, dolan bareng!
              </h1>
              <p className="type-body mt-1 text-on-surface-variant">
                Cari destinasi &amp; teman trip seru
              </p>
            </div>
          </div>

          <div className="mt-5 md:hidden">
            <Link
              href={ROUTES.jelajah}
              className="flex items-center gap-3 rounded-full bg-surface-container-lowest px-4 py-3 shadow-sm"
            >
              <Icon name="search" className="text-[20px] text-secondary" />
              <span className="type-body truncate text-outline">
                Cari destinasi, kota, atau teman jalan...
              </span>
            </Link>
            <Link href={ROUTES.jelajah} className="btn-primary mt-3 w-full">
              Mulai jelajah
            </Link>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {["Wisata Alam", "Cafe Hopping", "Pantai"].map((chip) => (
                <span
                  key={chip}
                  className="chip shrink-0 bg-surface-container-lowest/95 text-on-surface shadow-sm"
                >
                  {chip}
                </span>
              ))}
            </div>
            <p className="type-caption mt-3 text-center font-medium text-on-surface-variant">
              100% Join trip gratis · Tanpa biaya perantara
            </p>
          </div>

          {/* Desktop hero */}
          <div className="hidden items-center gap-8 md:grid md:grid-cols-12 md:min-h-[420px]">
            <div className="relative col-span-5 flex items-center justify-start">
              <div className="group relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  alt="Globe Bumi Indonesia"
                  className="-ml-16 h-[380px] w-[380px] max-w-none object-contain drop-shadow-2xl transition-transform duration-700 ease-out group-hover:scale-[1.03] lg:-ml-20 lg:h-[440px] lg:w-[440px]"
                  src={ASSETS.globe}
                />
                <div className="absolute left-16 top-24 flex items-center gap-1.5 rounded-full bg-surface-container-lowest/95 px-3 py-1.5 shadow-md backdrop-blur-md">
                  <span className="h-2 w-2 rounded-full bg-primary-container" />
                  <span className="type-micro text-on-surface">
                    Bali · Kumpul Sunset
                  </span>
                </div>
                <div className="absolute bottom-28 left-36 flex items-center gap-1.5 rounded-full bg-surface-container-lowest/95 px-3 py-1.5 shadow-md backdrop-blur-md">
                  <span className="h-2 w-2 rounded-full bg-secondary" />
                  <span className="type-micro text-on-surface">
                    Labuan Bajo · Liveaboard
                  </span>
                </div>
              </div>
            </div>

            <div className="col-span-7 flex flex-col justify-center">
              <div className="mb-4 inline-flex items-center gap-2 self-start rounded-full bg-surface-container-lowest/90 px-3.5 py-1.5 shadow-sm backdrop-blur-md">
                <span className="text-sm" aria-hidden>
                  ✈
                </span>
                <span className="type-micro uppercase tracking-[0.06em] text-secondary">
                  Jelajah Nusantara Bareng Teman Baru
                </span>
              </div>
              <h1 className="type-display max-w-[18ch] text-on-background">
                Temukan destinasi &amp; teman perjalanan
              </h1>
              <p className="type-body-lg mt-3 max-w-xl text-on-surface-variant">
                Rencanakan trip sesuai budget, lalu ajukan join trip publik —
                gratis.
              </p>

              <div className="mt-6 rounded-[24px] bg-surface-container-lowest/95 p-4 shadow-[0_12px_32px_rgba(2,132,199,0.1)] backdrop-blur-xl">
                <form
                  action={ROUTES.jelajah}
                  className="grid grid-cols-12 items-center gap-3"
                >
                  <div className="col-span-5 flex items-center gap-2.5 rounded-full bg-surface px-3.5 py-2.5">
                    <Icon
                      name="location_on"
                      className="text-[20px] text-secondary"
                    />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <label className="type-micro text-on-surface-variant">
                        Tujuan
                      </label>
                      <input
                        name="q"
                        defaultValue="Bali"
                        className="type-label w-full truncate bg-transparent text-on-surface placeholder:text-outline-variant focus:outline-none"
                        placeholder="Bali, Labuan Bajo, Jogja"
                      />
                    </div>
                  </div>
                  <div className="col-span-4 flex items-center gap-2.5 rounded-full bg-surface px-3.5 py-2.5">
                    <Icon
                      name="calendar_month"
                      className="text-[20px] text-secondary"
                    />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <label className="type-micro text-on-surface-variant">
                        Tanggal Liburan
                      </label>
                      <input
                        name="date"
                        className="type-label w-full truncate bg-transparent text-on-surface placeholder:text-outline-variant focus:outline-none"
                        placeholder="Pilih tanggal"
                        readOnly
                      />
                    </div>
                  </div>
                  <div className="col-span-3">
                    <button type="submit" className="btn-primary w-full">
                      <Icon name="search" className="text-[18px]" />
                      Cari
                    </button>
                  </div>
                </form>
              </div>

              <div className="type-caption mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-on-surface-variant">
                <span className="inline-flex items-center gap-1.5">
                  <span className="font-bold text-secondary">✓</span> Data wisata
                  nyata
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="font-bold text-secondary">✓</span> Join trip
                  gratis
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="hidden bg-surface-container-lowest py-12 md:block">
        <div className="mx-auto grid max-w-[1200px] grid-cols-4 gap-4 px-margin-desktop lg:gap-5">
          {features.map((f) => (
            <Link
              key={f.title}
              href={f.href}
              className={`flex flex-col gap-3 rounded-2xl p-5 transition-colors ${f.tone}`}
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${f.iconTone}`}
              >
                <Icon name={f.icon} className="text-[22px]" />
              </div>
              <div>
                <h2 className="type-subtitle text-on-surface">{f.title}</h2>
                <p className="type-caption mt-1 text-on-surface-variant">
                  {f.desc}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-surface py-8 md:py-12">
        <div className="mx-auto max-w-[1200px] px-margin md:px-margin-desktop">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="type-micro mb-1 hidden uppercase tracking-[0.08em] text-secondary md:block">
                Eksplorasi Bersama Pekan Ini
              </p>
              <h2 className="type-title text-on-surface">
                <span className="md:hidden">Trip Terdekat</span>
                <span className="hidden md:inline">Trip publik populer</span>
              </h2>
            </div>
            <Link
              href={ROUTES.jelajah}
              className="type-label shrink-0 text-secondary hover:underline"
            >
              Lihat semua
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
            {trips.map((trip) => (
              <Link
                key={trip.title}
                href={trip.href}
                className="card-surface group overflow-hidden transition-shadow hover:shadow-[0_8px_24px_rgba(255,90,61,0.08)]"
              >
                <div className="aspect-[16/10] overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt={trip.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    src={trip.cover}
                  />
                </div>
                <div className="p-4">
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    <span className="chip bg-secondary-fixed text-on-secondary-container">
                      Join gratis
                    </span>
                    <span className="chip bg-surface-container text-on-surface-variant">
                      {trip.date}
                    </span>
                  </div>
                  <h3 className="type-subtitle text-on-surface">{trip.title}</h3>
                  <p className="type-caption mt-1 text-on-surface-variant">
                    {trip.place} · {trip.seats}
                  </p>
                  <span className="btn-primary mt-3 !min-h-9 !px-4 !text-[0.8125rem]">
                    Ajukan join
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="hidden bg-gradient-to-r from-secondary to-[#0284C7] py-10 text-white md:block">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-8 px-margin-desktop">
          <div className="max-w-xl">
            <h2 className="type-title text-white">Punya rencana trip sendiri?</h2>
            <p className="type-body mt-2 text-white/90">
              Bikin dolan, undang teman baru, dan koordinasi titik kumpul — tanpa
              biaya join.
            </p>
          </div>
          <Link
            href={ROUTES.buatTrip}
            className="btn-primary shrink-0 !shadow-[0_8px_24px_rgba(255,90,61,0.35)]"
          >
            Bikin Dolan Sekarang
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
