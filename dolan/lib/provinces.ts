import catalogJson from "../../database/data/indonesia-provinces.json";

export type CuratedProvince = (typeof catalogJson)[number];
export const INDONESIA_PROVINCES = catalogJson;

export function findProvince(input: string) {
  const value = input.trim().toLocaleLowerCase("id-ID");
  return INDONESIA_PROVINCES.find((province) => province.slug === value || province.name.toLocaleLowerCase("id-ID") === value);
}

export function searchProvinces(input: string) {
  const value = input.trim().toLocaleLowerCase("id-ID");
  if (value.length < 2) return [];
  return INDONESIA_PROVINCES.filter((province) => province.name.toLocaleLowerCase("id-ID").includes(value)).slice(0, 6);
}
