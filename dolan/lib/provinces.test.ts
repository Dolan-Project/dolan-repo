import { describe, expect, it } from "vitest";
import { INDONESIA_PROVINCES, listProvinceCatalog } from "./provinces";

describe("listProvinceCatalog", () => {
  it("lists all 38 province itinerary templates", () => {
    const provinces = listProvinceCatalog();
    expect(provinces).toHaveLength(38);
    expect(INDONESIA_PROVINCES).toHaveLength(38);
    expect(provinces.every((province) => province.template.id && province.template.durationDays >= 1)).toBe(true);
  });

  it("filters by province name or capital and is not capped at 8", () => {
    const papua = listProvinceCatalog("papua");
    expect(papua.length).toBeGreaterThanOrEqual(6);
    expect(papua.every((province) => province.slug.includes("papua") || province.name.toLocaleLowerCase("id-ID").includes("papua"))).toBe(true);
    expect(listProvinceCatalog("Denpasar")[0]?.slug).toBe("bali");
    expect(listProvinceCatalog()).toHaveLength(38);
  });

  it("finds a province by name, capital, template id, and href", async () => {
    const { findProvince, findProvinceForTemplate, provinceDetailHref, searchProvinces } = await import("./provinces");
    expect(findProvince("Jawa Barat")?.slug).toBe("jawa-barat");
    expect(searchProvinces("x")).toHaveLength(0);
    expect(searchProvinces("bandung").some((item) => item.slug === "jawa-barat")).toBe(true);
    const province = findProvince("Bali")!;
    expect(findProvinceForTemplate({ templateId: province.template.id })?.slug).toBe("bali");
    expect(findProvinceForTemplate({ city: "Denpasar" })?.slug).toBe("bali");
    expect(findProvinceForTemplate({})).toBeUndefined();
    expect(provinceDetailHref({ city: "Denpasar" })).toBe("/provinsi/bali");
    expect(provinceDetailHref({ city: "Atlantis" })).toBeNull();
  });
});
