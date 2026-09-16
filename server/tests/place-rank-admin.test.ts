import { describe, expect, it } from "vitest";
import { isAdministrativePlace } from "../src/modules/search/place-rank.ts";

describe("administrative place filter", () => {
  it("rejects a province that is not a tourist attraction", () => {
    expect(
      isAdministrativePlace({
        name: "Jawa Barat",
        types: ["administrative_area_level_1", "political"],
      }),
    ).toBe(true);
  });

  it("keeps a real tourist place even if the name mentions a region", () => {
    expect(
      isAdministrativePlace({
        name: "Gedung Sate",
        types: ["tourist_attraction", "point_of_interest"],
      }),
    ).toBe(false);
  });
});
