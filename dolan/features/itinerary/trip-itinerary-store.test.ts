import { describe, expect, it } from "vitest";
import { getMockItinerarySnapshot, setMockChecklist, upsertMockChecklistItem } from "./trip-itinerary-store";

describe("trip itinerary packing store", () => {
  it("replaces packing titles while keeping checked state", () => {
    const tripId = `pack-store-${Date.now()}`;
    upsertMockChecklistItem(tripId, { title: "Powerbank", isCompleted: true, dueDate: null });
    const next = setMockChecklist(tripId, ["Powerbank", "Jaket"]);
    expect(next.checklist.map((item) => item.title)).toEqual(["Powerbank", "Jaket"]);
    expect(next.checklist.find((item) => item.title === "Powerbank")?.isCompleted).toBe(true);
    expect(getMockItinerarySnapshot(tripId).checklist).toHaveLength(2);
  });

  it("does not duplicate the same packing title", () => {
    const tripId = `pack-dup-${Date.now()}`;
    const first = upsertMockChecklistItem(tripId, { title: "Sunscreen", isCompleted: false, dueDate: null });
    const second = upsertMockChecklistItem(tripId, { title: "Sunscreen", isCompleted: false, dueDate: null });
    expect(second.id).toBe(first.id);
    expect(getMockItinerarySnapshot(tripId).checklist).toHaveLength(1);
    const completed = upsertMockChecklistItem(tripId, { title: "Sunscreen", isCompleted: true });
    expect(completed.isCompleted).toBe(true);
  });

  it("updates a packing item by id and ignores an empty day save", async () => {
    const { saveMockItinerarySnapshot } = await import("./trip-itinerary-store");
    const tripId = `pack-id-${Date.now()}`;
    const created = upsertMockChecklistItem(tripId, { title: "Topi", isCompleted: false, dueDate: null });
    const updated = upsertMockChecklistItem(tripId, {
      id: created.id,
      title: "Topi lebar",
      isCompleted: true,
      dueDate: "2026-11-01",
    });
    expect(updated.title).toBe("Topi lebar");
    expect(updated.isCompleted).toBe(true);
    const missing = upsertMockChecklistItem(tripId, { id: "missing", title: "Ghost" });
    expect(missing.title).toBe("Topi lebar");
    const kept = saveMockItinerarySnapshot(tripId, []);
    expect(kept.checklist.length).toBeGreaterThan(0);
  });
});
