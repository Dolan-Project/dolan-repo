import { describe, expect, it } from "vitest";
import { findScheduleConflicts, generateAlternative } from "./api";
import { createEditorSnapshot, INITIAL_BUDGET_ITEMS } from "./mock-data";
import { buildDestinationItinerary } from "@/lib/destination-itinerary";
import { packItinerarySchedule, toItinerarySaveDays } from "@/lib/template-itinerary";
import { saveItineraryVersionSchema } from "@dolan/shared";

describe("itinerary editor adapter", () => {
  it("detects an overlap including travel time", () => {
    const snapshot = createEditorSnapshot("komodo-4d3n");
    const days = structuredClone(snapshot.versions[0].days);
    days[0].stops[1].startTime = "10:00";
    expect(findScheduleConflicts(days)[days[0].stops[1].id]).toContain("paling awal");
  });

  it("treats a stop after midnight as continuation, not an overlap", () => {
    const days = structuredClone(createEditorSnapshot("komodo-4d3n").versions[0].days).slice(0, 1);
    days[0].stops[0].startTime = "22:00";
    days[0].stops[0].durationMinutes = 120;
    days[0].stops[1].travelDurationMinutes = 30;
    days[0].stops[1].startTime = "00:30";
    expect(findScheduleConflicts(days)[days[0].stops[1].id]).toBeUndefined();
  });

  it("packs a destination itinerary into a payload the save schema accepts", () => {
    const days = packItinerarySchedule(buildDestinationItinerary({
      destination: "Bromo",
      startDate: "2026-10-01",
      endDate: "2026-10-03",
    }));
    expect(findScheduleConflicts(days)).toEqual({});
    const parsed = saveItineraryVersionSchema.safeParse({
      baseVersionId: "wizard-v1",
      summary: "Rute Bromo",
      days: toItinerarySaveDays(days, "2026-10-01"),
      budgetItems: [],
    });
    expect(parsed.success).toBe(true);
    expect(parsed.data?.days[0].stops[0].latitude).toBeTypeOf("number");
  });

  it("keeps the active version and locked stops while generating an alternative", async () => {
    const snapshot = createEditorSnapshot("komodo-4d3n");
    const lockedIds = snapshot.versions[0].days.flatMap((day) => day.stops).filter((stop) => stop.isLocked).map((stop) => stop.id);
    const next = await generateAlternative(snapshot, snapshot.versions[0].days, INITIAL_BUDGET_ITEMS);
    expect(next.snapshot.activeVersionId).toBe(snapshot.activeVersionId);
    expect(next.snapshot.versions[0].days.flatMap((day) => day.stops).filter((stop) => stop.isLocked).map((stop) => stop.id)).toEqual(lockedIds);
  });

  it("rebuilds a cheaper itinerary instead of only rewriting notes", async () => {
    const snapshot = createEditorSnapshot("komodo-4d3n");
    const next = await generateAlternative(snapshot, snapshot.versions[0].days, INITIAL_BUDGET_ITEMS, "cheaper");
    expect(next.snapshot.versions[0].summary).toMatch(/hemat/i);
    expect(next.snapshot.versions[0].id).not.toBe(snapshot.activeVersionId);
    expect(next.snapshot.versions[0].days.flatMap((day) => day.stops).length).toBeGreaterThan(0);
    expect(next.snapshot.versions[0].days.flatMap((day) => day.stops.map((stop) => stop.notes)).join(" ")).toMatch(/hemat/i);
  });
});
