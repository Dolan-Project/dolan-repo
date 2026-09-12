import { describe, expect, it } from "vitest";
import { MemoryTripStore } from "../src/modules/trips/memory-store.ts";

describe("trip row lock", () => {
  it("runs withTripLock callbacks for the same trip one after another", async () => {
    const store = new MemoryTripStore();
    const trip = await store.createTrip({
      hostUserId: "11111111-1111-4111-8111-111111111111",
      title: "Lock me",
      description: null,
      visibility: "PRIVATE",
      status: "DRAFT",
      startDate: null,
      endDate: null,
      timezone: "Asia/Jakarta",
      privateOriginLabel: null,
      privateOriginLatitude: null,
      privateOriginLongitude: null,
      destinationCity: null,
      publicMeetingPointLabel: null,
      publicMeetingPointLatitude: null,
      publicMeetingPointLongitude: null,
      transportMode: null,
      budgetAmount: null,
      budgetBasis: "PER_PERSON",
      currency: "IDR",
      planningPartySize: 1,
      maxParticipants: null,
      currentItineraryVersionId: null,
      preferences: null,
    });

    const order: number[] = [];
    const first = store.withTripLock(trip.id, async () => {
      order.push(1);
      await new Promise((resolve) => setTimeout(resolve, 30));
      order.push(2);
      return "a";
    });
    const second = store.withTripLock(trip.id, async () => {
      order.push(3);
      return "b";
    });

    await expect(Promise.all([first, second])).resolves.toEqual(["a", "b"]);
    expect(order).toEqual([1, 2, 3]);
  });
});
