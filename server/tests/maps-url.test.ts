import { describe, expect, it } from "vitest";
import { googleMapsDirUrl } from "../src/modules/location/maps-url.ts";

describe("googleMapsDirUrl", () => {
  it("returns null without usable stops", () => {
    expect(googleMapsDirUrl([])).toBeNull();
    expect(googleMapsDirUrl([{ name: "" }])).toBeNull();
  });

  it("builds a driving URL from coordinates and names", () => {
    const two = googleMapsDirUrl([
      { name: "Gedung Sate", latitude: -6.9, longitude: 107.6 },
      { name: "Braga" },
    ]);
    expect(two).toContain("origin=");
    expect(two).toContain("destination=");
    expect(two).not.toContain("waypoints=");

    const three = googleMapsDirUrl([
      { name: "A", latitude: 1, longitude: 2 },
      { name: "B", latitude: 3, longitude: 4 },
      { name: "C" },
    ]);
    expect(three).toContain("waypoints=");
  });
});
