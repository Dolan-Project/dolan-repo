import { describe, expect, it } from "vitest";
import { findScheduleConflicts, generateAlternative } from "./api";
import { createEditorSnapshot, INITIAL_BUDGET_ITEMS } from "./mock-data";

describe("itinerary editor adapter", () => {
  it("detects an overlap including travel time", () => {
    const snapshot = createEditorSnapshot("komodo-4d3n");
    const days = structuredClone(snapshot.versions[0].days);
    days[0].stops[1].startTime = "10:00";
    expect(findScheduleConflicts(days)[days[0].stops[1].id]).toContain("paling awal");
  });

  it("keeps the active version and locked stops while generating an alternative", async () => {
    const snapshot = createEditorSnapshot("komodo-4d3n");
    const lockedIds = snapshot.versions[0].days.flatMap((day) => day.stops).filter((stop) => stop.isLocked).map((stop) => stop.id);
    const next = await generateAlternative(snapshot, snapshot.versions[0].days, INITIAL_BUDGET_ITEMS);
    expect(next.activeVersionId).toBe(snapshot.activeVersionId);
    expect(next.versions[0].days.flatMap((day) => day.stops).filter((stop) => stop.isLocked).map((stop) => stop.id)).toEqual(lockedIds);
  });
});
