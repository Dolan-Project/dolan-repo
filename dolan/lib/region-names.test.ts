import { describe, expect, it } from "vitest";
import { administrativeRegionHub, isAdministrativeRegionName } from "./region-names";

describe("region names", () => {
  it("treats a province name as an administrative region", () => {
    expect(isAdministrativeRegionName("Jawa Barat")).toBe(true);
    expect(isAdministrativeRegionName("  bali  ")).toBe(true);
    expect(isAdministrativeRegionName("Gedung Sate")).toBe(false);
    expect(isAdministrativeRegionName("")).toBe(false);
  });

  it("returns the hub coordinate for a province name", () => {
    const hub = administrativeRegionHub("Jawa Barat");
    expect(hub?.lat).toBeCloseTo(-6.9175, 2);
    expect(hub?.lng).toBeCloseTo(107.6191, 2);
    expect(administrativeRegionHub("Batu Secret Zoo")).toBeNull();
  });
});
