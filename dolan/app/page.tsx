import Link from "next/link";
import { EarthGlobe } from "@/components/home/EarthGlobe";
import { AppShell } from "@/components/layout/AppShell";
import { Icon } from "@/components/ui/Icon";
import { getSession } from "@/lib/auth/get-session";
import { ASSETS } from "@/lib/assets";
import { ROUTES } from "@/lib/routes";

const features = [
  {
    n: "1",
    title: "Temukan Tujuan",
    desc: "Jelajahi destinasi autentik dengan rute, foto traveler, dan trip publik di sekitarnya.",
    tone: "bg-surface-container-high text-primary",
  },
  {
    n: "2",
    title: "Susun Rencana & Budget",
    desc: "Hitung biaya mandiri tanpa fee perantara. Join trip tetap gratis.",
    tone: "bg-secondary-fixed text-on-secondary-container",
  },
  {
    n: "3",
    title: "Berangkat Bersama",
    desc: "Lihat reputasi rekan, koordinasi titik kumpul, lalu gas bareng.",
    tone: "bg-tertiary-fixed text-tertiary",
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

const chips = ["🌿 Alam", "🏖️ Pantai", "🌋 Gunung", "🤿 Snorkeling"] as const;

function firstName(displayName: string | undefined) {
  const name = displayName?.trim();
  if (!name) return "Traveler";
  return name.split(/\s+/)[0] ?? "Traveler";
}

export default async function BerandaPage() {
  const session = await getSession();
  const hello = firstName(
    session?.user.displayName || session?.user.username,
  );

  return (
    <AppShell>
      <section className="lg:hidden">
        <div className="flex items-center justify-between gap-2 px-margin pt-3">
          <span className="chip bg-surface-container-low text-on-surface">
            <Icon name="location_on" className="mr-1 text-[14px] text-primary" />
            Malang, Jawa Timur
          </span>
          <span className="chip bg-tertiary-fixed text-tertiary">
            Cerah · 24°C
          </span>
        </div>
        <div className="px-margin pt-3">
          <h1 className="type-title text-on-surface">Halo {hello}! 👋</h1>
          <p className="type-body mt-1 text-on-surface-variant">
            Mau dolan ke mana akhir pekan ini?
          </p>
        </div>
        <div className="px-margin py-3">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary-container to-tertiary p-5 text-on-primary shadow-md">
            <p className="chip bg-on-primary/15 text-primary-fixed">
              Komunitas Open-Trip Independen
            </p>
            <h2 className="type-subtitle mt-2 text-on-primary">
              Jelajahi Nusantara Bersama Teman Baru
            </h2>
            <p className="type-caption mt-1.5 text-on-primary-container">
              Bebas biaya agensi. Patungan transparan, kumpul di titik temu,
              explore bareng tanpa beban.
            </p>
          </div>
        </div>
        <form action={ROUTES.jelajah} className="px-margin pb-2">
          <div className="card-surface flex flex-col gap-2.5 p-3">
            <div className="flex items-center gap-2.5 rounded-xl bg-surface-container-low px-3 py-2.5">
              <Icon name="search" className="text-[20px] text-primary" />
              <div className="min-w-0 flex-1">
                <label className="type-micro text-on-surface-variant">
                  Mau Jelajah Mana?
                </label>
                <input
                  name="q"
                  className="type-label w-full bg-transparent text-on-surface placeholder:text-outline focus:outline-none"
                  placeholder="Ketik pulau, gunung, atau pantai..."
                />
              </div>
            </div>
            <button type="submit" className="btn-primary w-full">
              <Icon name="explore" className="text-[18px]" />
              Cari Rombongan Dolan
            </button>
          </div>
        </form>
        <div className="flex gap-2 overflow-x-auto px-margin pb-2">
          {["Open-Trip Aktif", "Solo Friendly", "Backpacker Hemat"].map(
            (chip) => (
              <span
                key={chip}
                className="chip shrink-0 bg-surface-container-high text-on-surface"
              >
                {chip}
              </span>
            ),
          )}
        </div>
      </section>

      <section className="relative hidden overflow-hidden bg-gradient-to-b from-surface via-surface-container-low to-surface pb-16 pt-10 lg:block lg:min-h-[760px]">
        <div className="pointer-events-none absolute -left-16 -top-10 h-96 w-96 rounded-full bg-tertiary-fixed/35 blur-3xl" />
        <div className="pointer-events-none absolute right-0 top-1/4 h-[420px] w-[420px] rounded-full bg-secondary-fixed/40 blur-3xl" />
        <EarthGlobe />

        <div className="relative z-20 mx-auto flex min-h-[560px] w-full max-w-[1240px] items-center justify-between gap-8 px-margin-desktop pt-8">
          <div className="w-5/12 shrink-0" />
          <div className="flex w-7/12 flex-col">
            <div className="mb-4 inline-flex items-center gap-2 self-start rounded-full bg-surface-container-high px-3.5 py-1.5 text-primary shadow-sm">
              <Icon name="explore" className="text-[18px]" />
              <span className="type-label">
                Social Travel Terbuka untuk Indonesia
              </span>
            </div>
            <h1 className="type-display max-w-[16ch] text-on-background">
              Tujuannya sama.{" "}
              <span className="bg-gradient-to-r from-primary via-tertiary-container to-secondary-container bg-clip-text text-transparent">
                Ceritanya bisa bersama.
              </span>
            </h1>
            <p className="type-body-lg mt-3 max-w-xl text-on-surface-variant">
              Temukan destinasi tersembunyi, budget transparan, dan teman
              seperjalanan tanpa calo. Join trip publik gratis.
            </p>

            <form
              action={ROUTES.jelajah}
              className="mt-6 rounded-2xl bg-surface-container-lowest/95 p-4 shadow-[0_8px_30px_-4px_rgba(16,36,58,0.08)] backdrop-blur-xl"
            >
              <div className="grid grid-cols-12 items-end gap-2">
                <div className="col-span-4 rounded-xl bg-surface-container-low/80 px-3.5 py-2.5">
                  <label className="type-micro flex items-center gap-1 text-on-surface-variant">
                    <Icon
                      name="location_on"
                      className="text-[14px] text-secondary"
                    />
                    Tujuan / Kota
                  </label>
                  <input
                    name="q"
                    defaultValue="Labuan Bajo, NTT"
                    className="type-label mt-0.5 w-full truncate bg-transparent text-on-surface placeholder:text-outline focus:outline-none"
                    placeholder="Mau ke mana?"
                  />
                </div>
                <div className="col-span-3 rounded-xl bg-surface-container-low/80 px-3.5 py-2.5">
                  <label className="type-micro flex items-center gap-1 text-on-surface-variant">
                    <Icon
                      name="calendar_month"
                      className="text-[14px] text-primary"
                    />
                    Tanggal Trip
                  </label>
                  <input
                    name="date"
                    defaultValue="25 – 28 Okt"
                    className="type-label mt-0.5 w-full truncate bg-transparent text-on-surface focus:outline-none"
                    readOnly
                  />
                </div>
                <div className="col-span-3 rounded-xl bg-surface-container-low/80 px-3.5 py-2.5">
                  <label className="type-micro flex items-center gap-1 text-on-surface-variant">
                    <Icon
                      name="payments"
                      className="text-[14px] text-tertiary"
                    />
                    Budget Maksimal
                  </label>
                  <select
                    name="budget"
                    defaultValue="standar"
                    className="type-label mt-0.5 w-full bg-transparent text-on-surface focus:outline-none"
                  >
                    <option value="hemat">Hemat (&lt; Rp1 Juta)</option>
                    <option value="standar">Sedang (Rp1–3 Juta)</option>
                    <option value="ekspedisi">Ekspedisi (&gt; Rp3 Juta)</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <button
                    type="submit"
                    className="btn-primary h-14 w-full !rounded-xl"
                  >
                    <Icon name="explore" className="text-[20px]" />
                    Cari
                  </button>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className="type-micro text-on-surface-variant">
                  Filter cepat:
                </span>
                {chips.map((chip) => (
                  <span
                    key={chip}
                    className="chip bg-surface-container-high text-primary"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </form>
            <p className="type-caption mt-3 text-on-surface-variant">
              ✓ Data wisata nyata · ✓ Join trip gratis · ✓ Tanpa biaya perantara
            </p>
          </div>
        </div>
      </section>

      <section className="hidden bg-surface py-14 lg:block">
        <div className="mx-auto max-w-[1240px] px-margin-desktop">
          <div className="mx-auto mb-8 max-w-2xl text-center">
            <p className="type-micro uppercase tracking-wider text-primary">
              Simpel, terbuka &amp; aman
            </p>
            <h2 className="type-title mt-1 text-on-surface">
              Cara Kerja Platform DOLAN
            </h2>
            <p className="type-body mt-2 text-on-surface-variant">
              Mempertemukan traveler dengan rute yang sama. Semua biaya dibayar
              langsung ke penyedia lokal.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {features.map((f) => (
              <div key={f.n} className="card-surface p-6">
                <div
                  className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl text-2xl font-extrabold ${f.tone}`}
                >
                  {f.n}
                </div>
                <h3 className="type-subtitle text-on-surface">{f.title}</h3>
                <p className="type-body mt-2 text-on-surface-variant">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-surface py-8 lg:pb-14 lg:pt-0">
        <div className="mx-auto max-w-[1240px] px-margin md:px-margin-desktop">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="type-micro mb-1 uppercase tracking-[0.08em] text-primary">
                Eksplorasi bersama pekan ini
              </p>
              <h2 className="type-title text-on-surface">
                <span className="lg:hidden">Open-Trip Komunitas</span>
                <span className="hidden lg:inline">Trip publik populer</span>
              </h2>
            </div>
            <Link
              href={ROUTES.jelajah}
              className="type-label shrink-0 text-primary hover:underline"
            >
              Lihat semua
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
            {trips.map((trip) => (
              <Link
                key={trip.title}
                href={trip.href}
                className="card-surface group overflow-hidden transition-shadow hover:shadow-[0_8px_24px_rgba(37,99,235,0.08)]"
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

      <section className="hidden bg-primary py-12 text-on-primary lg:block">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between gap-6 px-margin-desktop">
          <div className="max-w-xl">
            <h2 className="type-title text-on-primary">
              Punya rencana trip sendiri?
            </h2>
            <p className="type-body mt-2 text-on-primary-container">
              Bikin dolan, undang teman baru, dan koordinasi titik kumpul — tanpa
              biaya join.
            </p>
          </div>
          <Link href={ROUTES.buatTrip} className="btn-primary shrink-0">
            Bikin Dolan Sekarang
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
