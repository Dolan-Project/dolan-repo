import { describe, expect, it } from "vitest";
import { mockCreateTrip, mockListMyTrips } from "./trips";

describe("trip mocks", () => {
  it("does not include joinFee on trip summaries", () => {
    const result = mockListMyTrips("success", "hosted");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.every((trip) => !("joinFee" in trip))).toBe(true);
    }
  });

  it("keeps pending lists separate from joined", () => {
    const pending = mockListMyTrips("success", "pending");
    const joined = mockListMyTrips("success", "joined");
    expect(pending.success && joined.success).toBe(true);
    if (pending.success && joined.success) {
      const joinedIds = new Set(joined.data.map((trip) => trip.id));
      expect(pending.data.length).toBeGreaterThan(0);
      expect(pending.data.every((trip) => !joinedIds.has(trip.id))).toBe(true);
    }
  });

  it("create trip empty scenario returns no trip body payment fields", () => {
    const created = mockCreateTrip("success");
    expect(created.success).toBe(true);
    if (created.success) {
      expect("joinFee" in created.data).toBe(false);
    }
  });

  it("places hosted trip markers on public meeting coordinates", () => {
    const result = mockListMyTrips("success", "hosted");
    expect(result.success).toBe(true);
    if (!result.success) return;
    const yogya = result.data.find((trip) => trip.id === "trip_1");
    expect(yogya?.publicMeetingPointLabel).toBe("Stasiun Tugu");
    expect(yogya?.publicMeetingPointLatitude).toBeCloseTo(-7.7891, 3);
    expect(yogya?.publicMeetingPointLongitude).toBeCloseTo(110.3636, 3);
  });

  it("stores origin and meeting coordinates from the mock Places catalog", () => {
    const created = mockCreateTrip("success", {
      path: "known",
      title: "Sailing Komodo 4D3N",
      description: "",
      origin: "Jakarta",
      destinationCity: "Labuan Bajo",
      startDate: "2026-10-24",
      endDate: "2026-10-27",
      transport: "Kapal Phinisi",
      planningPartySize: 4,
      budgetAmount: 2_000_000,
      budgetBasis: "PER_PERSON",
      activityPrefs: [],
      lodgingPref: "",
      visibility: "PUBLIC",
      maxParticipants: 7,
      meetingPoint: "Bandara Komodo (LBJ)",
      companionNote: "",
    });
    expect(created.success).toBe(true);
    if (!created.success) return;
    expect(created.data.privateOriginLatitude).toBeCloseTo(-6.2088, 3);
    expect(created.data.publicMeetingPointLatitude).toBeCloseTo(-8.4866, 3);
    expect(created.data.publicMeetingPointLabel).toBe("Bandara Komodo (LBJ)");
  });

  it("does not keep Yogyakarta coordinates when a cloned seed has a new meeting point", () => {
    const result = mockListMyTrips("success", "hosted");
    expect(result.success).toBe(true);
    if (!result.success) return;
    const dieng = result.data.find((trip) => trip.id === "trip_closed");
    expect(dieng?.publicMeetingPointLabel).toBe("Alun-alun Wonosobo");
    expect(dieng?.publicMeetingPointLatitude).toBeCloseTo(-7.36, 2);
    expect(dieng?.publicMeetingPointLongitude).toBeCloseTo(109.9, 1);
  });
});
