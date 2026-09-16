import { describe, expect, it } from "vitest";
import { DOMICILE_OPTIONS, searchDomiciles } from "./domiciles";

describe("domiciles", () => {
  it("includes cities outside the old five-option list", () => {
    const labels = DOMICILE_OPTIONS.map((option) => option.label);
    expect(labels).toContain("Kota Bandung, Jawa Barat");
    expect(labels).toContain("Kota Cirebon, Jawa Barat");
    expect(labels).toContain("Kabupaten Sleman, DI Yogyakarta");
    expect(labels).toContain("Kota Makassar, Sulawesi Selatan");
    expect(labels).toContain("Jakarta Selatan, DKI Jakarta");
    expect(DOMICILE_OPTIONS.length).toBeGreaterThan(100);
  });

  it("filters by city or province", () => {
    expect(searchDomiciles("cirebon").map((option) => option.name)).toEqual(["Cirebon", "Cirebon"]);
    expect(searchDomiciles("papua").every((option) => option.province.toLowerCase().includes("papua"))).toBe(true);
  });
});
