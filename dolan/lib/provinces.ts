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
  return INDONESIA_PROVINCES
    .map((province) => {
      const name = province.name.toLocaleLowerCase("id-ID");
      const capital = province.capital.toLocaleLowerCase("id-ID");
      let score = -1;
      if (name.startsWith(value) || capital.startsWith(value)) score = 0;
      else if (name.includes(value) || capital.includes(value)) score = 1;
      return score < 0 ? null : { province, score };
    })
    .filter((row): row is { province: (typeof INDONESIA_PROVINCES)[number]; score: number } => row !== null)
    .sort((a, b) => a.score - b.score || a.province.name.localeCompare(b.province.name, "id"))
    .map((row) => row.province)
    .slice(0, 8);
}

export function findProvinceForTemplate(input: { templateId?: string; city?: string | null }) {
  if (input.templateId) {
    const byId = INDONESIA_PROVINCES.find((province) => province.template.id === input.templateId);
    if (byId) return byId;
  }
  const value = (input.city ?? "").trim().toLocaleLowerCase("id-ID");
  if (!value) return undefined;
  return INDONESIA_PROVINCES.find((province) => {
    const name = province.name.toLocaleLowerCase("id-ID");
    const capital = province.capital.toLocaleLowerCase("id-ID");
    return province.slug === value || name === value || capital === value || name.includes(value) || capital.includes(value);
  });
}

export function provinceDetailHref(input: { templateId?: string; city?: string | null }) {
  const province = findProvinceForTemplate(input);
  return province ? `/provinsi/${province.slug}` : null;
}
