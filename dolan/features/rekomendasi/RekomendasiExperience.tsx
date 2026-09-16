"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ASSETS } from "@/lib/assets";
import { ROUTES } from "@/lib/routes";
import {
  FEATURED_SLUGS,
  ISLAND_GROUPS,
  type IslandId,
} from "@/features/rekomendasi/islands";
import styles from "./rekomendasi.module.css";

export type ProvincePromo = {
  slug: string;
  name: string;
  capital: string;
  cover: string;
  durationDays: number | null;
  place: string;
  teaser: string;
  href: string;
};

const FILTERS: { id: IslandId; label: string }[] = [
  { id: "semua", label: "Semua daerah" },
  ...ISLAND_GROUPS.map((group) => ({ id: group.id, label: group.label })),
];

function bySlug(provinces: ProvincePromo[], slug: string) {
  return provinces.find((item) => item.slug === slug);
}

export function RekomendasiExperience({ provinces }: { provinces: ProvincePromo[] }) {
  const [island, setIsland] = useState<IslandId>("semua");
  const names = useMemo(() => provinces.map((item) => item.name), [provinces]);
  const featured = FEATURED_SLUGS.map((slug) => bySlug(provinces, slug)).filter(
    (item): item is ProvincePromo => Boolean(item),
  );
  const groups =
    island === "semua"
      ? ISLAND_GROUPS
      : ISLAND_GROUPS.filter((group) => group.id === island);
  const [lead, ...restFeatured] = featured;

  return (
    <div className={styles.page}>
      <section className={styles.hero} aria-labelledby="rekomendasi-title">
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>{provinces.length} provinsi Indonesia</p>
          <h1 id="rekomendasi-title" className={styles.title}>
            Nusantara, dari ujung ke ujung.
          </h1>
          <p className={styles.lede}>
            Setiap daerah punya ritme sendiri. Dolan kumpulin foto, ibu kota, dan
            rute singkat supaya kamu bisa pilih tujuan sebelum berangkat.
          </p>
          <div className={styles.heroActions}>
            <a className={styles.primaryCta} href="#daerah">
              Lihat {provinces.length} daerah
            </a>
            <Link className={styles.ghostCta} href={ROUTES.buatTrip}>
              Buat trip
            </Link>
          </div>
          <dl className={styles.stats}>
            <div>
              <dt className="sr-only">Jumlah provinsi</dt>
              <dd>
                <span className={styles.statValue}>{provinces.length}</span>
                <span className={styles.statLabel}>daerah siap dijelajah</span>
              </dd>
            </div>
            <div>
              <dt className="sr-only">Gugus pulau</dt>
              <dd>
                <span className={styles.statValue}>6</span>
                <span className={styles.statLabel}>gugus pulau di peta</span>
              </dd>
            </div>
            <div>
              <dt className="sr-only">Rute kurasi</dt>
              <dd>
                <span className={styles.statValue}>3 hari</span>
                <span className={styles.statLabel}>rute singkat tiap daerah</span>
              </dd>
            </div>
          </dl>
        </div>
        <div className={styles.heroPhoto}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={ASSETS.komodo}
            alt="Perairan Komodo di Nusa Tenggara Timur"
            className={styles.heroImg}
          />
          <div className={styles.heroScrim} />
          <p className={styles.heroCaption}>
            <span className={styles.heroCaptionDot} />
            Komodo, Nusa Tenggara Timur
          </p>
        </div>
      </section>

      <div className={styles.marqueeWrap} aria-hidden="true">
        <div className={styles.marquee}>
          {[0, 1].map((copy) => (
            <div key={copy}>
              {names.map((name) => (
                <span key={`${copy}-${name}`}>{name}</span>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className={styles.filters} role="tablist" aria-label="Saring gugus pulau">
        {FILTERS.map((filter) => {
          const active = island === filter.id;
          return (
            <button
              key={filter.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={`${styles.chip} ${active ? styles.chipActive : ""}`}
              onClick={() => setIsland(filter.id)}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      {island === "semua" && lead ? (
        <section className={styles.section} aria-labelledby="wajib-title">
          <div className={styles.sectionHead}>
            <div>
              <h2 id="wajib-title" className={styles.sectionTitle}>
                Yang paling sering dicari
              </h2>
              <p className={styles.sectionLine}>
                Lima daerah yang paling sering jadi titik awal trip di Dolan.
              </p>
            </div>
          </div>
          <div className={styles.featured}>
            <ProvinceTile province={lead} size="hero" />
            {restFeatured.slice(0, 2).map((province) => (
              <ProvinceTile key={province.slug} province={province} size="tall" />
            ))}
          </div>
          {restFeatured.length > 2 ? (
            <div className={styles.pair}>
              {restFeatured.slice(2).map((province) => (
                <ProvinceTile key={province.slug} province={province} size="wide" />
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      <div id="daerah">
        {groups.map((group) => {
          const items = group.slugs
            .map((slug) => bySlug(provinces, slug))
            .filter((item): item is ProvincePromo => Boolean(item));
          const [first, ...rest] = items;
          if (!first) return null;
          return (
            <section
              key={group.id}
              className={styles.section}
              aria-labelledby={`pulau-${group.id}`}
            >
              <div className={styles.sectionHead}>
                <div>
                  <h2 id={`pulau-${group.id}`} className={styles.sectionTitle}>
                    {group.label}
                  </h2>
                  <p className={styles.sectionLine}>{group.line}</p>
                </div>
                <p className={styles.count}>{items.length} daerah</p>
              </div>
              <ProvinceTile province={first} size="wide" />
              {rest.length > 0 ? (
                <div className={styles.mosaic}>
                  {rest.map((province) => (
                    <ProvinceTile key={province.slug} province={province} size="compact" />
                  ))}
                </div>
              ) : null}
            </section>
          );
        })}
      </div>

      <section className={styles.close} aria-labelledby="close-title">
        <div className={styles.closeInner}>
          <div>
            <h2 id="close-title" className={styles.closeTitle}>
              Pilih daerah. Susun rutenya.
            </h2>
            <p className={styles.closeCopy}>
              Buka salah satu kartu untuk lihat tempat unggulan, lalu pakai
              template Dolan atau mulai trip dari nol.
            </p>
          </div>
          <Link className={styles.primaryCta} href={ROUTES.buatTrip}>
            Buat trip
          </Link>
        </div>
      </section>
    </div>
  );
}

function ProvinceTile({
  province,
  size,
}: {
  province: ProvincePromo;
  size: "hero" | "tall" | "wide" | "compact";
}) {
  const sizeClass =
    size === "hero"
      ? styles.tileHero
      : size === "tall"
        ? styles.tileTall
        : size === "wide"
          ? styles.tileWide
          : "";

  return (
    <Link href={province.href} className={`${styles.tile} ${sizeClass}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={province.cover} alt="" className={styles.tileImg} />
      <span className={styles.tileShade} />
      <span className={styles.tileBody}>
        <span className={styles.tileMeta}>
          <span className={styles.badge}>
            {province.durationDays ? `${province.durationDays} hari` : province.capital}
          </span>
          <span className={styles.place}>{province.place}</span>
        </span>
        <span className={styles.tileName}>{province.name}</span>
        {size !== "compact" ? (
          <span className={styles.tileTeaser}>{province.teaser}</span>
        ) : null}
      </span>
    </Link>
  );
}
