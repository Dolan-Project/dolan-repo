import { describe, expect, it } from "vitest";
import { mockCreateTrip, mockGetTrip, mockListMyTrips } from "./trips";

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
      expect(pending.data.every((trip) => !joinedIds.has(trip.id))).toBe(true);
    }
  });

  it("lists only trips created in this session on My Trip", () => {
    const hosted = mockListMyTrips("success", "hosted");
    expect(hosted.success).toBe(true);
    if (!hosted.success) return;
    expect(hosted.data.find((trip) => trip.id === "trip_1")).toBeUndefined();
    expect(hosted.data.find((trip) => trip.id === "trip_closed")).toBeUndefined();
    expect(hosted.data.find((trip) => trip.id === "trip_host")).toBeUndefined();

    const created = mockCreateTrip("success", {
      path: "known",
      title: "Trip milik saya",
      description: "",
      origin: "Jakarta",
      meetingPoint: "Stasiun Bandung",
      destinationCity: "Bandung",
      startDate: "2026-11-01",
      endDate: "2026-11-03",
      transport: "Kereta",
      planningPartySize: 2,
      budgetAmount: 1_000_000,
      budgetBasis: "PER_PERSON",
      activityPrefs: [],
      lodgingPref: "",
      visibility: "PRIVATE",
      companionNote: "",
    });
    expect(created.success).toBe(true);
    if (!created.success) return;
    const after = mockListMyTrips("success", "hosted");
    expect(after.success).toBe(true);
    if (!after.success) return;
    expect(after.data.some((trip) => trip.id === created.data.id)).toBe(true);
  });

  it("exposes the completed joined trip for attendance and review", () => {
    const completed = mockGetTrip("success", "trip_completed");
    expect(completed.success).toBe(true);
    if (!completed.success) return;
    expect(completed.data.status).toBe("COMPLETED");
    expect(completed.data.host.username).toBe("wayan");
  });

  it("create trip empty scenario returns no trip body payment fields", () => {
    const created = mockCreateTrip("success");
    expect(created.success).toBe(true);
    if (created.success) {
      expect("joinFee" in created.data).toBe(false);
    }
  });

  it("places hosted trip markers on public meeting coordinates", () => {
    const result = mockGetTrip("success", "trip_1");
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.publicMeetingPointLabel).toBe("Stasiun Tugu");
    expect(result.data.publicMeetingPointLatitude).toBeCloseTo(-7.7891, 3);
    expect(result.data.publicMeetingPointLongitude).toBeCloseTo(110.3636, 3);
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
    const result = mockGetTrip("success", "trip_closed");
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.publicMeetingPointLabel).toBe("Alun-alun Wonosobo");
    expect(result.data.publicMeetingPointLatitude).toBeCloseTo(-7.36, 2);
    expect(result.data.publicMeetingPointLongitude).toBeCloseTo(109.9, 1);
  });

  it("lets a guest read a public non-draft trip without the host origin", () => {
    const result = mockGetTrip("success", "trip_1", { guest: true });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.viewerRole).toBe("none");
    expect(result.data.privateOriginLabel).toBeNull();
    expect(result.data.origin).toBeUndefined();
    expect(result.data.preferences).toBeNull();
    expect(result.data.activityPrefs).toBeUndefined();
    expect(result.data.publicMeetingPointLabel).toBe("Stasiun Tugu");
    expect(result.data.host.displayName).toBe("Salsa");
  });

  it("hides a private trip from a guest", () => {
    const result = mockGetTrip("success", "trip_private", { guest: true });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe("NOT_FOUND");
  });

  it("lets the host read their private trip with origin", () => {
    const result = mockGetTrip("success", "trip_private");
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.viewerRole).toBe("host");
    expect(result.data.visibility).toBe("PRIVATE");
    expect(result.data.privateOriginLabel).toBe("Jakarta");
  });

  it("lets a logged-in user see a public trip they do not host as a visitor", () => {
    const result = mockGetTrip("success", "trip_open");
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.viewerRole).toBe("none");
    expect(result.data.host.username).toBe("wayan");
    expect(result.data.joinFree).toBe(true);
    expect(result.data.myJoinRequest).toBeNull();
  });
});
