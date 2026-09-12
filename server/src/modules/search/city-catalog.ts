export const INDONESIA_CITIES = [
  "Ambon",
  "Balikpapan",
  "Banda Aceh",
  "Bandar Lampung",
  "Bandung",
  "Banjarmasin",
  "Batam",
  "Bekasi",
  "Bogor",
  "Denpasar",
  "Depok",
  "Gorontalo",
  "Jakarta",
  "Jambi",
  "Jayapura",
  "Kediri",
  "Kendari",
  "Kupang",
  "Lombok",
  "Makassar",
  "Malang",
  "Manado",
  "Mataram",
  "Medan",
  "Padang",
  "Palangka Raya",
  "Palembang",
  "Pekanbaru",
  "Pontianak",
  "Samarinda",
  "Semarang",
  "Solo",
  "Surabaya",
  "Tangerang",
  "Yogyakarta",
] as const;

const CITY_ALIASES: Record<string, string> = {
  jogja: "Yogyakarta",
  jogjakarta: "Yogyakarta",
  yogya: "Yogyakarta",
  yogyakarta: "Yogyakarta",
  diy: "Yogyakarta",
  solo: "Solo",
  surakarta: "Solo",
  bali: "Denpasar",
  jakarta: "Jakarta",
  dki: "Jakarta",
};

const CITY_PREFIX = /^(kota|kabupaten|kab\.?|kecamatan|kec\.?|provinsi|prov\.?|daerah istimewa)\s+/i;

export function normalizeCityName(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.replace(/\s+/g, " ").trim();
  if (!trimmed) return null;

  const withoutPrefix = trimmed.replace(CITY_PREFIX, "").trim();
  const aliasKey = withoutPrefix.toLocaleLowerCase("id-ID");
  if (CITY_ALIASES[aliasKey]) return CITY_ALIASES[aliasKey];

  const catalog = INDONESIA_CITIES.find((city) => city.toLocaleLowerCase("id-ID") === aliasKey);
  if (catalog) return catalog;

  return withoutPrefix;
}

export function searchIndonesiaCities(query: string | undefined, extra: string[] = []) {
  const needle = query?.trim().toLocaleLowerCase("id-ID") ?? "";
  const unique = new Set<string>(
    [...INDONESIA_CITIES, ...extra.map((city) => normalizeCityName(city) ?? city)].filter(Boolean),
  );
  const names = [...unique].sort((a, b) => a.localeCompare(b, "id"));
  const filtered = needle ? names.filter((name) => name.toLocaleLowerCase("id-ID").includes(needle)) : names;
  return filtered.map((name) => ({ name, countryCode: "ID" as const }));
}
