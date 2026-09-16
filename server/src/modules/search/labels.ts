import type { TemplatePopularityLabel, TemplateSource, TemplateSourceLabel } from "@dolan/shared";

export function templateSourceLabel(source: TemplateSource): TemplateSourceLabel {
  return source === "CURATED" ? "Kurasi Dolan" : "Dari traveler Dolan";
}

export function templatePopularityLabel(usageCount: number): TemplatePopularityLabel | null {
  return usageCount > 0 ? "Populer di Dolan" : null;
}

export function addUtcDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function uniqueById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const unique: T[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    unique.push(item);
  }
  return unique;
}

export function slicePage<T>(items: T[], page: number, limit: number) {
  const start = (page - 1) * limit;
  return {
    items: items.slice(start, start + limit),
    total: items.length,
  };
}
