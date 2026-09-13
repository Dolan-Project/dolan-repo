import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Icon } from "@/components/ui/Icon";
import { ASSETS } from "@/lib/assets";
import { ROUTES } from "@/lib/routes";

const publicTrips = [
  {
    title: "Santai Sore & Sunset Canggu",
    host: "@ari_bali",
    status: "Sedang di sana",
    seats: "Sisa 2",
    cover: ASSETS.cangguCampfire,
  },
  {
    title: "Snorkeling Menjangan Barat",
    host: "@maya_sea",
    status: "Akan berangkat",
    seats: "Sisa 3",
    cover: ASSETS.nusaPenida,
  },
  {
    title: "Ubud Yoga & Waterfall Run",
    host: "@bagus_spirit",
    status: "Akan berangkat",
    seats: "Sisa 1",
    cover: ASSETS.cangguUbud,
  },
] as const;

const days = [
  {
    day: "Hari 1",
    title: "Kuta & Seminyak",
    mobileTitle: "Seminyak & Pantai Sunset",
    tone: "bg-primary-container",
  },
  {
    day: "Hari 2",
    title: "Ubud & Kintamani",
    mobileTitle: "Ubud & Hutan Tropis",
    tone: "bg-tertiary",
  },
  {
    day: "Hari 3",
    title: "Nusa Penida",
    mobileTitle: "Nusa Penida Day Trip",
    tone: "bg-secondary",
  },
] as const;

export default function DetailWisataBaliPage() {
  return (
    <AppShell>
      <div className="sticky top-16 z-40 flex items-center justify-between gap-2 border-b border-outline-variant/30 bg-surface/90 px-margin py-2.5 backdrop-blur-md md:hidden">
        <Link
          href={ROUTES.jelajah}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-container"
          aria-label="Kembali"
        >
          <Icon name="arrow_back" className="text-[18px]" />
        </Link>
        <p className="type-label min-w-0 flex-1 truncate text-on-surface">
          Bali, Indonesia
        </p>
        <button
          type="button"
          aria-label="Simpan"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-container"
        >
          <Icon name="bookmark" className="text-[18px]" />
        </button>
        <button
          type="button"
          aria-label="Bagikan"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-container"
        >
          <Icon name="share" className="text-[18px]" />
        </button>
      </div>

      <div className="mx-auto max-w-[1200px] px-margin py-5 md:px-margin-desktop md:py-8">
        <div className="mb-5 hidden items-start justify-between gap-6 md:flex">
          <div>
            <div className="mb-2.5 flex flex-wrap gap-1.5">
              {["Pantai", "Budaya", "Destinasi Komunitas Populer"].map(
                (chip) => (
                  <span
                    key={chip}
                    className="chip bg-secondary-fixed text-on-secondary-container"
                  >
                    {chip}
                  </span>
                ),
              )}
            </div>
            <h1 className="type-display text-on-background">Bali</h1>
            <p className="type-body mt-1.5 flex items-center gap-1 text-on-surface-variant">
              <Icon name="location_on" className="text-[16px] text-secondary" />
              Pulau Dewata · Indonesia
            </p>
          </div>
          <div className="flex gap-2">
            <button type="button" className="btn-ghost">
              <Icon name="bookmark" className="text-[16px]" />
              Simpan Tempat
            </button>
            <button type="button" className="btn-ghost">
              <Icon name="share" className="text-[16px]" />
              Bagikan
            </button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-12 md:gap-4">
          <div className="overflow-hidden rounded-2xl md:col-span-7 md:rounded-3xl">
            <div className="aspect-[4/3] md:aspect-[16/11]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt="Pura Tanah Lot"
                className="h-full w-full object-cover"
                src={ASSETS.tanahLot}
              />
            </div>
          </div>
          <div className="hidden flex-col gap-3 md:col-span-5 md:flex">
            <div className="card-surface p-4">
              <div className="flex items-center gap-1.5 text-primary-container">
                <Icon name="star" filled className="text-[18px]" />
                <span className="type-title text-on-surface">4.9</span>
              </div>
              <p className="type-caption mt-0.5 text-on-surface-variant">
                42.810 ulasan wisatawan
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-surface-container-low p-2.5">
                  <p className="type-label text-on-surface">Mei–Okt</p>
                  <p className="type-caption text-on-surface-variant">
                    Musim terbaik
                  </p>
                </div>
                <div className="rounded-xl bg-surface-container-low p-2.5">
                  <p className="type-label text-on-surface">27–31°C</p>
                  <p className="type-caption text-on-surface-variant">
                    Suhu rata-rata
                  </p>
                </div>
              </div>
            </div>
            <div className="flex-1 rounded-3xl bg-tertiary-fixed/50 p-4">
              <h2 className="type-subtitle text-on-surface">
                Budaya &amp; Etika Adat
              </h2>
              <p className="type-body mt-1.5 text-on-surface-variant">
                Hormati area pura, pakai kain/selendang saat masuk, dan cek
                kalender upacara lokal sebelum berkunjung.
              </p>
            </div>
          </div>
        </div>

        <div className="card-surface mt-3 p-4 md:hidden">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {["Pantai", "Budaya"].map((c) => (
              <span
                key={c}
                className="chip bg-secondary-fixed text-on-secondary-container"
              >
                {c}
              </span>
            ))}
          </div>
          <h1 className="type-display">Bali</h1>
          <div className="type-caption mt-1.5 flex items-center gap-3">
            <span className="inline-flex items-center gap-1 font-semibold text-primary-container">
              <Icon name="star" filled className="text-[14px]" /> 4.9
            </span>
            <span className="text-on-surface-variant">Mei–Okt</span>
          </div>
          <p className="type-body mt-2 text-on-surface-variant">
            Pulau Dewata dengan pantai, budaya, dan komunitas traveler yang
            aktif. Join trip publik gratis — biaya mandiri.
          </p>
        </div>

        <div className="mt-8 hidden md:block">
          <div className="mb-4 flex items-center gap-2.5">
            <span className="h-6 w-1 rounded-full bg-primary-container" />
            <h2 className="type-title">Mengenal Daya Tarik Pulau Dewata</h2>
          </div>
          <p className="type-body-lg max-w-3xl text-on-surface-variant">
            Bali menawarkan ritme santai dari sunset di pantai barat hingga
            hutan tropis Ubud. Di Dolan, kamu bisa temukan teman jalan untuk
            rute yang sama tanpa biaya join — setiap orang menanggung biaya
            perjalanannya sendiri.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="card-surface p-5">
              <h3 className="type-subtitle">Info Kunci Kunjungan</h3>
              <ul className="type-body mt-3 space-y-2 text-on-surface-variant">
                <li>Durasi ideal: 3–7 hari</li>
                <li>Akses: Bandara Ngurah Rai (DPS)</li>
                <li>Transport lokal: motor sewa, grab, shuttle</li>
                <li>Buka: spot wisata umumnya sesuai jadwal pura</li>
              </ul>
            </div>
            <div className="card-surface p-5">
              <h3 className="type-subtitle">Perencanaan &amp; Logistik</h3>
              <ul className="type-body mt-3 space-y-2 text-on-surface-variant">
                <li>Siapkan budget harian mandiri</li>
                <li>Koordinasi titik kumpul via chat trip</li>
                <li>Cek cuaca &amp; tide sebelum snorkeling</li>
                <li>Hormati zona suci dan aturan desa adat</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-2.5 md:hidden">
          <Link href={ROUTES.buatTrip} className="btn-primary w-full">
            Buat trip ke sini
          </Link>
          <Link href={ROUTES.itineraryBali} className="btn-secondary w-full">
            Pakai itinerary
          </Link>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="card-surface p-4 md:p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="type-subtitle">
                <span className="md:hidden">Rute Rekomendasi 3 Hari</span>
                <span className="hidden md:inline">
                  Itinerary Populer Komunitas
                </span>
              </h3>
              <Link
                href={ROUTES.itineraryBali}
                className="type-label shrink-0 text-secondary"
              >
                Lihat detail
              </Link>
            </div>
            <ol className="space-y-3">
              {days.map((d, i) => (
                <li key={d.day} className="flex gap-2.5">
                  <span
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full type-micro text-white ${d.tone}`}
                  >
                    {i + 1}
                  </span>
                  <div>
                    <p className="type-micro uppercase text-on-surface-variant">
                      {d.day}
                    </p>
                    <p className="type-label text-on-surface">
                      <span className="md:hidden">{d.mobileTitle}</span>
                      <span className="hidden md:inline">{d.title}</span>
                    </p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-5 hidden gap-2 md:flex">
              <Link href={ROUTES.buatTrip} className="btn-primary !min-h-10">
                Buat Trip ke Sini
              </Link>
              <Link
                href={ROUTES.itineraryBali}
                className="btn-secondary !min-h-10"
              >
                Pakai Itinerary
              </Link>
            </div>
          </div>

          <div className="card-surface overflow-hidden">
            <div
              className="relative h-48 bg-cover bg-center md:h-full md:min-h-[280px]"
              style={{ backgroundImage: `url('${ASSETS.mapBali}')` }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-on-surface/40 to-transparent" />
              <svg
                className="absolute inset-0 h-full w-full"
                viewBox="0 0 400 300"
                preserveAspectRatio="none"
                aria-hidden
              >
                <path
                  d="M60 220 C120 180, 180 140, 240 120 S340 80, 360 60"
                  fill="none"
                  stroke="#22C55E"
                  strokeWidth="3"
                  strokeDasharray="6 6"
                />
              </svg>
              <p className="type-label absolute bottom-3 left-3 rounded-full bg-surface-container-lowest/95 px-3 py-1 text-on-surface">
                Peta Akses &amp; Jalur Dolan
              </p>
            </div>
          </div>
        </div>

        <section className="mt-8" id="trip-publik">
          <div className="mb-3 flex items-end justify-between gap-3">
            <h2 className="type-title">Trip publik ke Bali</h2>
            <Link
              href={ROUTES.jelajah}
              className="type-label shrink-0 text-secondary"
            >
              Lihat daftar
            </Link>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {publicTrips.map((trip, idx) => (
              <Link
                key={trip.title}
                href={idx === 0 ? ROUTES.trip("trip_1") : ROUTES.jelajah}
                className={`card-surface overflow-hidden ${
                  idx === 2 ? "hidden md:block" : ""
                }`}
              >
                <div className="aspect-[16/10]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt=""
                    className="h-full w-full object-cover"
                    src={trip.cover}
                  />
                </div>
                <div className="p-3.5">
                  <div className="mb-1.5 flex flex-wrap gap-1">
                    <span className="chip bg-secondary-fixed text-on-secondary-container">
                      Join gratis
                    </span>
                    <span
                      className={`chip ${
                        trip.seats === "Sisa 1"
                          ? "bg-error-container text-on-error-container"
                          : "bg-surface-container text-on-surface-variant"
                      }`}
                    >
                      {trip.seats}
                    </span>
                  </div>
                  <h3 className="type-label text-on-surface">{trip.title}</h3>
                  <p className="type-caption mt-0.5 text-on-surface-variant">
                    {trip.host} · {trip.status}
                  </p>
                  <span className="type-label mt-2 inline-flex text-primary-container">
                    Ajukan join
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-8">
          <h2 className="type-title mb-3">
            <span className="md:hidden">Cerita Teman Dolan</span>
            <span className="hidden md:inline">
              Ulasan Destinasi &amp; Pengalaman Traveler
            </span>
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {[
              {
                name: "Dimas",
                text: "Sunset di Canggu bareng rombongan Dolan seru banget. Titik kumpul jelas, vibe santai.",
              },
              {
                name: "Sarah",
                text: "Nusa Penida worth it kalau split transport. Join gratis bikin gampang nemu teman trip.",
              },
            ].map((r) => (
              <div key={r.name} className="card-surface p-4">
                <div className="mb-1.5 flex items-center gap-0.5 text-primary-container">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Icon
                      key={i}
                      name="star"
                      filled
                      className="text-[14px]"
                    />
                  ))}
                </div>
                <p className="type-body text-on-surface-variant">“{r.text}”</p>
                <p className="type-label mt-2 text-on-surface">{r.name}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
