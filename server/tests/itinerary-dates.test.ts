import { describe, expect, it } from "vitest";
import { fillMissingDayDates } from "../src/modules/trips/itinerary-editor.ts";
import { formatExportStopLine } from "../src/modules/location/itinerary-export.ts";

describe("itinerary editor dates", () => {
  it("fills empty day dates from the trip start date", () => {
    const filled = fillMissingDayDates(
      [
        { id: "d1", dayNumber: 1, date: "" },
        { id: "d2", dayNumber: 2, date: "not-a-date" },
        { id: "d3", dayNumber: 3, date: "2026-11-02" },
      ],
      "2026-11-01",
    );
    expect(filled[0]?.date).toBe("2026-11-01");
    expect(filled[1]?.date).toBe("2026-11-02");
    expect(filled[2]?.date).toBe("2026-11-02");
  });
});

describe("pdf export stop lines", () => {
  it("includes time, distance, duration, meal, and unavailable copy", () => {
    expect(
      formatExportStopLine(
        {
          name: "Kelimutu",
          startTime: "09:00:00",
          travelDistanceMeters: 12300,
          travelDurationMinutes: 25,
          meal: "makan siang",
          notes: "Bawa jaket",
        },
        1,
      ),
    ).toContain("Kelimutu");
    expect(
      formatExportStopLine({ name: "Ferry", routeStatus: "UNAVAILABLE", startTime: "16:00" }, 2),
    ).toMatch(/Rute jalan tidak tersedia/);
  });
});
