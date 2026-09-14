import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

type CatalogProvince = {
  slug: string;
  places: Array<{ name: string; searchQuery: string }>;
  template: { id: string; title: string; durationDays: number; stops: unknown[] };
};

const catalog = JSON.parse(
  readFileSync(new URL("../../database/data/indonesia-provinces.json", import.meta.url), "utf8"),
) as CatalogProvince[];

describe("Indonesia province planning catalog", () => {
  it("contains one curated template and five real-place lookup queries for every province", () => {
    expect(catalog).toHaveLength(38);
    expect(new Set(catalog.map((province) => province.slug)).size).toBe(38);
    expect(catalog.flatMap((province) => province.places)).toHaveLength(190);
    for (const province of catalog) {
      expect(province.places).toHaveLength(5);
      expect(province.template.id).toMatch(/^[0-9a-f-]{36}$/);
      expect(province.template.title.length).toBeGreaterThan(5);
      expect(province.template.durationDays).toBeGreaterThan(0);
      expect(province.template.stops.length).toBeGreaterThan(0);
      expect(province.places.every((place) => place.name && place.searchQuery.includes("Indonesia"))).toBe(true);
    }
  });
});
