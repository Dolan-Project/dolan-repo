import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { PROVINCE_ATLAS } from "@/features/rekomendasi/atlas";
import { RekomendasiExperience } from "@/features/rekomendasi/RekomendasiExperience";
import { INDONESIA_PROVINCES } from "@/lib/provinces";
import { provinceCoverUrl } from "@/lib/province-cover";
import { ROUTES } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Rekomendasi daerah Indonesia | Dolan",
  description:
    "Jelajahi 38 provinsi Indonesia. Foto, cerita, dan rute singkat dari Aceh sampai Papua, siap dipakai untuk trip Dolan.",
};

export default function RekomendasiPage() {
  const catalog = new Map(INDONESIA_PROVINCES.map((province) => [province.slug, province]));
  const provinces = PROVINCE_ATLAS.map((row) => {
    const live = catalog.get(row.slug);
    return {
      slug: row.slug,
      name: row.name,
      capital: row.capital,
      cover: provinceCoverUrl({
        slug: row.slug,
        name: row.name,
        heroQuery: `${row.place}, ${row.name}, Indonesia`,
      }),
      durationDays: live?.template.durationDays ?? null,
      place: row.place,
      teaser: row.teaser,
      href: ROUTES.province(row.slug),
    };
  });

  return (
    <AppShell>
      <RekomendasiExperience provinces={provinces} />
    </AppShell>
  );
}
