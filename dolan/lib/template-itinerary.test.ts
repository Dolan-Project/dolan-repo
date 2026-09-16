import { describe, expect, it } from "vitest";
import {
  applyTemplatePrefill,
  applyPublicMeetingPoint,
  availableBudgetPool,
  canRegenerate,
  estimateItineraryBudget,
  firstStopMeetingLabel,
  googleMapsDirectionsUrl,
  hydrateItineraryPlaces,
  itineraryMapMarkers,
  MAX_ITINERARY_REGENERATES,
  overBudgetSaveMessage,
  moveStopInDay,
  packItinerarySchedule,
  placeFromTemplateStop,
  remainingRegenerates,
  visitWindowLabel,
  templateDaysToEditable,
  tripTitleFromDestination,
  validateWizardBasics,
} from "./template-itinerary";

describe("create trip wizard helpers", () => {
  it("requires destination, date range, people, and budget", () => {
    expect(validateWizardBasics({
      destinationCity: "",
      startDate: "",
      endDate: "2026-10-20",
      budgetAmount: 0,
      partySize: 0,
    })).toMatchObject({
      destinationCity: expect.any(String),
      startDate: expect.any(String),
      budgetAmount: expect.any(String),
      partySize: expect.any(String),
    });
    expect(validateWizardBasics({
      destinationCity: "Bali",
      startDate: "2026-10-24",
      endDate: "2026-10-21",
      budgetAmount: 1_500_000,
      partySize: 2,
    }).endDate).toMatch(/sebelum/);
    expect(validateWizardBasics({
      destinationCity: "Bali",
      startDate: "2026-10-21",
      endDate: "2026-10-24",
      budgetAmount: 1_500_000,
      partySize: 3,
    })).toEqual({});
    expect(validateWizardBasics({
      destinationCity: "Bali",
      startDate: "2026-10-21",
      endDate: "2026-10-24",
      budgetAmount: 10_000,
      partySize: 2,
    }).budgetAmount).toMatch(/jangkauan/i);
  });

  it("builds a trip title from destination and estimates per-stop ticket, food, and transport", () => {
    expect(tripTitleFromDestination("Bali")).toBe("Trip ke Bali");
    expect(availableBudgetPool(1_000_000, "PER_PERSON", 3)).toBe(3_000_000);
    const days = templateDaysToEditable(
      [{
        id: "d1",
        dayNumber: 1,
        title: "Hari 1",
        stops: [
          { sequence: 1, activityType: "VISIT", customTitle: "Tanah Lot", durationMinutes: 120, notes: "Sunset", place: null },
          { sequence: 2, activityType: "VISIT", customTitle: "Uluwatu", durationMinutes: 150, notes: null, place: null },
        ],
      }],
      "Bali",
      "2026-11-01",
    );
    const plan = estimateItineraryBudget(days, 200_000, 2);
    expect(plan.total).toBeGreaterThan(0);
    expect(plan.overBudget).toBe(true);
    const first = plan.byStopId[days[0].stops[0].id];
    expect(first.lines.some((line) => line.key === "transport")).toBe(true);
    expect(first.ticketCost).toBeGreaterThan(0);
    expect(first.total).toBe(first.ticketCost + first.foodCost + first.travelCost);
    expect(first.total).toBe(first.lines.reduce((sum, line) => sum + line.amount, 0));
    expect(first.lines.find((line) => line.key === "ticket")?.detail).toMatch(/perlu dicek/);
    expect(first.lines.every((line) => !/bukan tiket wajib/i.test(line.detail))).toBe(true);
    const foodAmounts = days[0].stops.map((stop) => plan.byStopId[stop.id].foodCost);
    expect(foodAmounts.some((amount) => amount > 0)).toBe(true);
    expect(new Set(foodAmounts).size).toBeGreaterThan(1);
    expect(foodAmounts.every((amount) => amount !== 55_000 * 2)).toBe(true);
    const fitted = estimateItineraryBudget(days, 5_000_000, 2);
    expect(fitted.overBudget).toBe(false);
    expect(overBudgetSaveMessage(1_500_000, 1_000_000)).toMatch(/melebihi budget yang tersedia/);
    expect(overBudgetSaveMessage(1_500_000, 1_000_000)).toMatch(/Kekurangan sekitar/);
  });

  it("does not invent tickets for free public places like Bundaran HI and Braga", () => {
    const days = templateDaysToEditable(
      [{
        id: "d1",
        dayNumber: 1,
        title: "Hari 1",
        stops: [
          { sequence: 1, activityType: "VISIT", customTitle: "Bundaran HI", durationMinutes: 60, notes: null, place: null },
          { sequence: 2, activityType: "VISIT", customTitle: "Jalan Braga", durationMinutes: 90, notes: null, place: null },
        ],
      }],
      "Jakarta",
      "2026-11-01",
    );
    const plan = estimateItineraryBudget(days, 1_000_000, 1);
    expect(plan.byStopId[days[0].stops[0].id].ticketCost).toBe(0);
    expect(plan.byStopId[days[0].stops[1].id].ticketCost).toBe(0);
    expect(plan.byStopId[days[0].stops[0].id].lines.some((line) => line.key === "ticket")).toBe(false);
  });

  it("charges tickets for paid venues like Ancol, Istana, and Taman Sari", async () => {
    const { placeTicketEstimate } = await import("./template-itinerary");
    expect(placeTicketEstimate("Ancol")).toBeGreaterThan(0);
    expect(placeTicketEstimate("Istana Maimun")).toBeGreaterThan(0);
    expect(placeTicketEstimate("Taman Sari")).toBeGreaterThan(0);
    expect(placeTicketEstimate("Museum Nasional Indonesia")).toBeGreaterThan(0);
    expect(placeTicketEstimate("Bundaran HI")).toBe(0);
  });

  it("packs a city day with short visits from morning into late afternoon", async () => {
    const { packItinerarySchedule } = await import("./template-itinerary");
    const packed = packItinerarySchedule(
      templateDaysToEditable(
        [{
          id: "d1",
          dayNumber: 1,
          title: "Hari 1",
          stops: Array.from({ length: 8 }, (_, index) => ({
            sequence: index + 1,
            activityType: "VISIT",
            customTitle: `Tempat ${index + 1}`,
            durationMinutes: 180,
            notes: null,
            place: null,
          })),
        }],
        "Jakarta",
        "2026-11-01",
      ),
    );
    expect(packed[0].stops).toHaveLength(8);
    expect(packed[0].stops.every((stop) => stop.durationMinutes <= 75)).toBe(true);
    expect(packed[0].stops[0].startTime).toBe("08:00");
    expect(packed[0].stops.at(-1)!.startTime! >= "16:00").toBe(true);
    const plan = estimateItineraryBudget(packed, 5_000_000, 1);
    const foods = packed[0].stops.map((stop) => plan.byStopId[stop.id].foodCost);
    expect(foods.filter((amount) => amount > 0).length).toBeGreaterThanOrEqual(2);
    expect(foods.filter((amount) => amount > 0).length).toBeLessThan(foods.length);
    expect(foods.reduce((sum, amount) => sum + amount, 0)).toBeLessThan(55_000 * foods.length);
    expect(new Set(foods.filter((amount) => amount > 0)).size).toBeGreaterThan(1);
  });

  it("prices walk / ojek / drive transport legs and labels day starts clearly", async () => {
    const { estimateTransportLeg } = await import("./template-itinerary");
    expect(estimateTransportLeg({ km: 0, isFirstOfDay: true }).label).toMatch(/Titik awal hari/i);
    expect(estimateTransportLeg({ km: 0.4, minutes: 8 }).cost).toBe(0);
    expect(estimateTransportLeg({ km: 0.4, minutes: 8 }).mode).toBe("walk");
    const ojek = estimateTransportLeg({ km: 5, minutes: 15 });
    expect(ojek.mode).toBe("ojek");
    expect(ojek.cost).toBeGreaterThanOrEqual(12_000);
    expect(ojek.label).toMatch(/ojek/i);
    const drive = estimateTransportLeg({ km: 40, minutes: 75 });
    expect(drive.mode).toBe("drive");
    expect(drive.cost).toBeGreaterThan(ojek.cost);
  });

  it("caps regenerate at two attempts", () => {
    expect(MAX_ITINERARY_REGENERATES).toBe(2);
    expect(canRegenerate(0)).toBe(true);
    expect(canRegenerate(2)).toBe(false);
    expect(remainingRegenerates(1)).toBe(1);
  });

  it("builds map markers from template days and reorders stops", () => {
    const days = templateDaysToEditable(
      [{
        id: "d1",
        dayNumber: 1,
        title: "Hari 1",
        stops: [
          { sequence: 1, activityType: "VISIT", customTitle: "Tanah Lot", durationMinutes: 120, notes: "Sunset", place: null },
          { sequence: 2, activityType: "VISIT", customTitle: "Uluwatu", durationMinutes: 150, notes: null, place: null },
        ],
      }],
      "Bali",
      "2026-11-01",
    );
    expect(days[0].date).toBe("2026-11-01");
    expect(days[0].stops[0].place?.latitude).toBeTypeOf("number");
    const moved = moveStopInDay(days, "d1", 0, 1);
    expect(moved[0].stops.map((stop) => stop.customTitle)).toEqual(["Uluwatu", "Tanah Lot"]);
    expect(moved[0].stops.map((stop) => stop.sequence)).toEqual([1, 2]);
    expect(moved[0].stops[1].startTime! >= moved[0].stops[0].startTime!).toBe(true);
    const markers = itineraryMapMarkers(moved, moved[0].stops[1].id);
    expect(markers).toHaveLength(2);
    expect(markers[1].selected).toBe(true);
  });

  it("hydrates missing coordinates from the stop name and keeps a packed schedule valid to save", () => {
    const days = hydrateItineraryPlaces([{
      id: "d1",
      dayNumber: 1,
      date: "2026-11-01",
      title: "Hari 1",
      stops: [{
        id: "s1",
        sequence: 1,
        place: null,
        customTitle: "Gedung Sate",
        activityType: "Wisata",
        startTime: "08:00",
        durationMinutes: 90,
        travelDurationMinutes: 0,
        notes: null,
        isLocked: false,
      }, {
        id: "s2",
        sequence: 2,
        place: null,
        customTitle: "Jalan Braga",
        activityType: "Wisata",
        startTime: "10:00",
        durationMinutes: 90,
        travelDurationMinutes: 20,
        notes: null,
        isLocked: false,
      }],
    }], "Bandung");
    expect(days[0].stops[0].place?.latitude).toBeCloseTo(-6.9, 1);
    expect(days[0].stops[1].place?.longitude).toBeCloseTo(107.6, 1);
    expect(itineraryMapMarkers(days, null)).toHaveLength(2);
    expect(googleMapsDirectionsUrl(itineraryMapMarkers(days, null))).toContain("google.com/maps/dir");
  });

  it("keeps an emptied destination title empty instead of restoring the place name", () => {
    const days = hydrateItineraryPlaces([{
      id: "d1",
      dayNumber: 1,
      date: "2026-09-17",
      title: "Hari 1",
      stops: [{
        id: "s1",
        sequence: 1,
        place: {
          googlePlaceId: "ChIJ-lasiana",
          name: "Pantai Lasiana",
          formattedAddress: "Lasiana, Kupang",
          city: "Kupang",
          latitude: -10.13,
          longitude: 123.66,
          rating: null,
          userRatingCount: null,
          photoName: null,
          googleMapsUrl: null,
        },
        customTitle: "",
        activityType: "Wisata",
        startTime: "09:00",
        durationMinutes: 90,
        travelDurationMinutes: 0,
        notes: null,
        isLocked: false,
      }],
    }], "Kupang");
    expect(days[0].stops[0].customTitle).toBe("");
    expect(days[0].stops[0].place?.name).toBe("Pantai Lasiana");
  });

  it("prefills wizard 2 from a chosen template", () => {
    expect(applyTemplatePrefill({
      title: "Rute Backpacker Bali",
      city: "Bali",
      transportMode: "Motor + kapal",
    })).toEqual({
      title: "Rute Backpacker Bali",
      destinationCity: "Bali",
      transport: "Motor + kapal",
    });
    const first = placeFromTemplateStop("Tanah Lot", "Bali");
    const second = placeFromTemplateStop("Uluwatu", "Bali");
    expect(first.latitude).toBeCloseTo(-8.62, 1);
    expect(second.latitude).toBeCloseTo(-8.83, 1);
    expect(first.latitude).not.toBe(second.latitude);
  });

  it("packs overlapping stop times and marks the first public stop as the meeting point", () => {
    const days = templateDaysToEditable(
      [{
        id: "d1",
        dayNumber: 1,
        title: "Hari 1",
        stops: [
          { sequence: 1, activityType: "VISIT", customTitle: "Tanah Lot", durationMinutes: 180, notes: null, place: null },
          { sequence: 2, activityType: "VISIT", customTitle: "Uluwatu", durationMinutes: 150, notes: null, place: null },
        ],
      }],
      "Bali",
      "2026-11-01",
    );
    expect(days[0].stops[0].startTime).toBe("15:30");
    expect(visitWindowLabel(days[0].stops[0].startTime, days[0].stops[0].durationMinutes)).toBe("15:30–18:30");
    const firstEnd = 15 * 60 + 30 + 180;
    const secondStart = Number(days[0].stops[1].startTime!.slice(0, 2)) * 60 + Number(days[0].stops[1].startTime!.slice(3));
    expect(secondStart).toBeGreaterThanOrEqual(firstEnd);
    const publicDays = applyPublicMeetingPoint(days, true);
    expect(publicDays[0].stops[0].activityType).toBe("Titik kumpul");
    expect(firstStopMeetingLabel(publicDays)).toBe("Tanah Lot");
  });

  it("keeps stop numbers continuous across days and maps every hydrated stop", () => {
    const days = packItinerarySchedule([
      {
        id: "d1",
        dayNumber: 1,
        date: "2026-11-01",
        title: "Hari 1",
        stops: [
          { id: "s1", sequence: 1, place: null, customTitle: "Tanah Lot", activityType: "VISIT", startTime: "08:00", durationMinutes: 60, travelDurationMinutes: 0, notes: null, isLocked: false },
          { id: "s2", sequence: 2, place: null, customTitle: "Uluwatu", activityType: "VISIT", startTime: "10:00", durationMinutes: 60, travelDurationMinutes: 0, notes: null, isLocked: false },
        ],
      },
      {
        id: "d2",
        dayNumber: 2,
        date: "2026-11-02",
        title: "Hari 2",
        stops: [
          { id: "s3", sequence: 1, place: null, customTitle: "Tirta Empul", activityType: "VISIT", startTime: "08:00", durationMinutes: 60, travelDurationMinutes: 0, notes: null, isLocked: false },
          { id: "s4", sequence: 2, place: null, customTitle: "GWK", activityType: "VISIT", startTime: "10:00", durationMinutes: 60, travelDurationMinutes: 0, notes: null, isLocked: false },
        ],
      },
    ], "Bali");
    expect(days[0].stops.map((stop) => stop.sequence)).toEqual([1, 2]);
    expect(days[1].stops.map((stop) => stop.sequence)).toEqual([3, 4]);
    const markers = itineraryMapMarkers(days, null, "Bali");
    expect(markers).toHaveLength(4);
    expect(markers.map((marker) => marker.sequence)).toEqual([1, 2, 3, 4]);
    const dayTwo = days.filter((day) => day.dayNumber === 2);
    expect(itineraryMapMarkers(dayTwo, null, "Bali").map((marker) => marker.sequence)).toEqual([3, 4]);
    expect(days[0].stops[1].travelDurationMinutes).toBeNull();
    const url = googleMapsDirectionsUrl(markers);
    expect(url).toMatch(/google\.com\/maps\/dir/);
    expect(url?.split("/").length).toBeGreaterThan(4);
  });
});
