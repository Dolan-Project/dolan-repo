import { describe, expect, it } from "vitest";
import { paginatePdfLines, renderItineraryPdf } from "../src/modules/location/itinerary-pdf.ts";

describe("itinerary pdf pagination", () => {
  it("splits long itineraries across pages", () => {
    const lines = Array.from({ length: 80 }, (_, index) => `Line ${index + 1}`);
    const pages = paginatePdfLines(lines, 46);
    expect(pages).toHaveLength(2);
    expect(pages[0]).toHaveLength(46);
    expect(pages[1]).toHaveLength(34);
    const pdf = renderItineraryPdf("Trip Flores", lines).toString("latin1");
    expect(pdf).toContain("/Count 2");
    expect(pdf).toContain("Halaman 1 / 2");
    expect(pdf).toContain("Line 80");
  });
});
