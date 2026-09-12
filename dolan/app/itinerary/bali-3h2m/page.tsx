import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Icon } from "@/components/ui/Icon";
import { ASSETS } from "@/lib/assets";
import { ROUTES } from "@/lib/routes";

const stops = [
  {
    no: "01",
    place: "Bandara I Gusti Ngurah Rai",
    when: "Hari 1 · 09:00–10:30",
    duration: "1.5 jam",
    cost: "Rp 50.000",
    leg: "± 38 km · 1j15 (Bypass → Ubud)",
    category: "Perjalanan",
    pinTone: "bg-tertiary",
  },
  {
    no: "02",
    place: "Ubud Water Palace & Saraswati",
    when: "Hari 2 · 11:30–15:00",
    duration: "3.5 jam",
    cost: "Rp 35.000",
    leg: "± 32 km · 1j (Munggu–Tabanan)",
    category: "Wisata Budaya",
    pinTone: "bg-primary-container",
  },
  {
    no: "03",
    place: "Sunset Tanah Lot & Pura Karang Bolong",
    when: "Hari 3 · 16:30–19:00",
    duration: "2.5 jam",
    cost: "Rp 30.000",
    leg: null,
    category: "Wisata Alam",
    pinTone: "bg-success",
  },
] as const;

export default function ItineraryBaliPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-[1440px] px-margin py-5 md:px-margin-desktop md:py-8">
        <div className="mb-5 flex flex-col gap-3 md:mb-6 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="mb-2.5 flex flex-wrap gap-1.5">
              <span className="chip bg-secondary-fixed text-on-secondary-container">
                Join gratis
              </span>
              <span className="chip bg-surface-container text-on-surface-variant">
                3 Hari 2 Malam
              </span>
              <span className="chip bg-tertiary-fixed text-on-tertiary-container">
                Wisata &amp; Budaya
              </span>
            </div>
            <h1 className="type-display max-w-[22ch] text-on-background">
              Itinerary · Trip ke Bali 3H2M
            </h1>
            <p className="type-body mt-1.5 max-w-2xl text-on-surface-variant">
              Rute perjalanan rekomendasi komunitas · Biaya perjalanan mandiri
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-ghost">
              <Icon name="share" className="text-[16px]" />
              Bagikan Rute
            </button>
            <button type="button" className="btn-ghost">
              <Icon name="bookmark" className="text-[16px]" />
              Simpan Trip
            </button>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-12">
            <div className="lg:col-span-6 lg:sticky lg:top-24 lg:self-start">
            <div className="card-surface overflow-hidden">
              <div
                className="relative h-[240px] bg-cover bg-center md:h-[520px]"
                style={{ backgroundImage: `url('${ASSETS.mapItinerary}')` }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-on-surface/50 via-transparent to-transparent" />
                {[
                  { label: "1", left: "22%", top: "68%", tone: "bg-tertiary" },
                  {
                    label: "2",
                    left: "48%",
                    top: "42%",
                    tone: "bg-primary-container",
                  },
                  {
                    label: "3",
                    left: "70%",
                    top: "55%",
                    tone: "bg-success",
                  },
                ].map((pin) => (
                  <div
                    key={pin.label}
                    className="absolute"
                    style={{ left: pin.left, top: pin.top }}
                  >
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full type-micro text-white shadow-lg ${pin.tone}`}
                    >
                      {pin.label}
                    </span>
                  </div>
                ))}
                <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-1.5">
                  {[
                    "Rute Jalur Darat (± 78 km)",
                    "3 Titik Kunjungan",
                    "Est. 4.5 Jam",
                  ].map((t) => (
                    <span
                      key={t}
                      className="chip bg-surface-container-lowest/95 text-on-surface"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              <p className="type-caption border-t border-outline-variant/30 px-4 py-2.5 text-on-surface-variant">
                Tip transport: sewa motor/mobil split antar peserta. Join gratis
                — tidak ada biaya admin Dolan.
              </p>
            </div>
          </div>

          <div className="lg:col-span-6">
            <h2 className="type-title mb-3">Rencana Perjalanan</h2>
            <div>
              {stops.map((stop) => (
                <div key={stop.no}>
                  <div className="card-surface p-3.5 md:p-4">
                    <div className="flex gap-3">
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl type-micro text-white ${stop.pinTone}`}
                      >
                        {stop.no}
                      </span>
                      <div className="min-w-0 flex-1">
                        <span className="chip bg-surface-container text-on-surface-variant">
                          {stop.category}
                        </span>
                        <h3 className="type-subtitle mt-1.5 text-on-surface">
                          {stop.place}
                        </h3>
                        <p className="type-caption mt-0.5 text-on-surface-variant">
                          {stop.when}
                        </p>
                        <div className="type-caption mt-2 flex flex-wrap gap-3 text-on-surface-variant">
                          <span className="inline-flex items-center gap-1">
                            <Icon name="schedule" className="text-[14px]" />
                            {stop.duration}
                          </span>
                          <span className="inline-flex items-center gap-1 font-semibold text-on-surface">
                            <Icon name="payments" className="text-[14px]" />
                            {stop.cost}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  {stop.leg ? (
                    <div className="flex items-center justify-center py-2.5">
                      <div className="type-caption inline-flex items-center gap-1.5 rounded-full bg-surface-container-high px-3 py-1 font-semibold text-on-surface-variant">
                        <Icon
                          name="arrow_downward"
                          className="text-[14px] text-success"
                        />
                        {stop.leg}
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Link href={ROUTES.buatTrip} className="btn-primary">
                Pakai Itinerary
              </Link>
              <a
                href="https://maps.google.com"
                target="_blank"
                rel="noreferrer"
                className="btn-secondary"
              >
                <Icon name="map" className="text-[18px]" />
                Buka di Google Maps
              </a>
              <button type="button" className="btn-ghost">
                Edit Itinerary
              </button>
              <button type="button" className="btn-ghost">
                Unduh PDF
              </button>
            </div>
            <p className="type-caption mt-3 text-on-surface-variant">
              Estimasi biaya di atas bersifat mandiri per orang. Join trip di
              Dolan tetap gratis — tidak ada biaya admin atau komisi host.
            </p>
          </div>
        </div>

        <section className="mt-8 rounded-[24px] bg-primary p-5 text-on-primary md:p-8">
          <p className="type-micro uppercase tracking-[0.1em] text-white/80">
            Kolaborasi Komunitas
          </p>
          <h2 className="type-title mt-1.5 text-white">
            Punya rekomendasi spot seru di rute ini?
          </h2>
          <p className="type-body mt-1.5 max-w-2xl text-white/90">
            Bagikan tips ke forum trip supaya teman dolan lain bisa ikut update
            rute.
          </p>
          <Link
            href={ROUTES.jelajah}
            className="btn-ghost mt-4 !border-0 !bg-surface-container-lowest"
          >
            Buka Forum Diskusi
          </Link>
        </section>
      </div>
    </AppShell>
  );
}
