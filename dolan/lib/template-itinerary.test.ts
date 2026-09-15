import { describe, expect, it } from "vitest";
import {
  applyTemplatePrefill,
  applyPublicMeetingPoint,
  appendVisitStop,
  availableBudgetPool,
  canRegenerate,
  describeTransportLeg,
  estimateItineraryBudget,
  firstStopMeetingLabel,
  googleMapsDirectionsUrl,
  hydrateItineraryPlaces,
  itineraryMapMarkers,
  MAX_ITINERARY_REGENERATES,
  mergeLockedStops,
  moveStopInDay,
  packItinerarySchedule,
  placeFromTemplateStop,
  placeSummaryFromPick,
  placeTicketEstimate,
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
    expect(plan.byStopId[days[0].stops[0].id].ticketCost).toBeGreaterThan(0);
    const foodStops = days[0].stops.filter((stop) => plan.byStopId[stop.id].foodCost > 0);
    expect(foodStops).toHaveLength(1);
    expect(plan.byStopId[foodStops[0]!.id].lines.some((line) => line.key === "food")).toBe(true);
    const fitted = estimateItineraryBudget(days, 5_000_000, 2);
    expect(fitted.overBudget).toBe(false);
  });

  it("names the vehicle and fare instead of calling a long hop walking", () => {
    const ancol = { lat: -6.1256, lng: 106.8333 };
    const kotaTua = { lat: -6.1352, lng: 106.8133 };
    const geologi = { lat: -6.9007, lng: 107.6191 };
    const gedungSate = { lat: -6.9025, lng: 107.6187 };
    const far = describeTransportLeg(ancol, kotaTua, { destinationName: "Kota Tua Jakarta" });
    expect(far.mode).not.toMatch(/jalan kaki/i);
    expect(far.detail).toMatch(/Naik/i);
    expect(far.amount).toBeGreaterThan(0);
    const walk = describeTransportLeg(geologi, gedungSate, { destinationName: "Gedung Sate" });
    expect(walk.mode).toMatch(/Jalan kaki/i);
    expect(walk.amount).toBe(0);
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

  it("treats Bundaran Hotel Indonesia as a free public landmark", () => {
    const days = templateDaysToEditable(
      [{
        id: "d1",
        dayNumber: 1,
        title: "Hari 1",
        stops: [
          { sequence: 1, activityType: "VISIT", customTitle: "Bundaran Hotel Indonesia", durationMinutes: 45, notes: null, place: null },
        ],
      }],
      "Jakarta",
      "2026-11-01",
    );
    expect(placeTicketEstimate("Bundaran Hotel Indonesia")).toBe(0);
    expect(estimateItineraryBudget(days, 1_000_000, 1).byStopId[days[0].stops[0].id].ticketCost).toBe(0);
    expect(placeTicketEstimate("Kafe di Menteng")).toBe(0);
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

  it("keeps itinerary numbers running across days on the list and map", () => {
    const days = templateDaysToEditable(
      [
        {
          id: "d1",
          dayNumber: 1,
          title: "Hari 1",
          stops: [
            { sequence: 1, activityType: "VISIT", customTitle: "Monumen Nasional", durationMinutes: 90, notes: null, place: null },
            { sequence: 2, activityType: "VISIT", customTitle: "Kota Tua Jakarta", durationMinutes: 90, notes: null, place: null },
            { sequence: 3, activityType: "VISIT", customTitle: "Bundaran HI", durationMinutes: 60, notes: null, place: null },
          ],
        },
        {
          id: "d2",
          dayNumber: 2,
          title: "Hari 2",
          stops: [
            { sequence: 1, activityType: "VISIT", customTitle: "Taman Menteng", durationMinutes: 90, notes: null, place: null },
          ],
        },
      ],
      "Jakarta",
      "2026-11-01",
    );
    expect(days[0].stops.map((stop) => stop.sequence)).toEqual([1, 2, 3]);
    expect(days[1].stops.map((stop) => stop.sequence)).toEqual([4]);
    expect(itineraryMapMarkers(days, null).map((marker) => marker.sequence)).toEqual([1, 2, 3, 4]);
  });

  it("packs weekday visits from morning through evening and appends a custom stop on the map", () => {
    const days = packItinerarySchedule(templateDaysToEditable(
      [{
        id: "d1",
        dayNumber: 1,
        title: "Hari 1",
        stops: [
          { sequence: 1, activityType: "VISIT", customTitle: "Monumen Nasional", durationMinutes: 90, notes: null, place: null },
          { sequence: 2, activityType: "VISIT", customTitle: "Kota Tua Jakarta", durationMinutes: 90, notes: null, place: null },
          { sequence: 3, activityType: "VISIT", customTitle: "Bundaran HI", durationMinutes: 60, notes: null, place: null },
          { sequence: 4, activityType: "VISIT", customTitle: "Taman Menteng", durationMinutes: 90, notes: null, place: null },
        ],
      }],
      "Jakarta",
      "2026-11-01",
    ));
    expect(days[0].stops[0].startTime).toBe("08:00");
    expect(days[0].stops.every((stop) => stop.durationMinutes <= 75)).toBe(true);
    expect(days[0].stops.length).toBe(4);
    const last = days[0].stops.at(-1)!;
    expect(visitWindowLabel(last.startTime, last.durationMinutes).slice(-5) < "18:00").toBe(true);
    const full = packItinerarySchedule(templateDaysToEditable(
      [{
        id: "d1",
        dayNumber: 1,
        title: "Hari 1",
        stops: [
          { sequence: 1, activityType: "VISIT", customTitle: "Monumen Nasional", durationMinutes: 90, notes: null, place: null },
          { sequence: 2, activityType: "VISIT", customTitle: "Kota Tua Jakarta", durationMinutes: 90, notes: null, place: null },
          { sequence: 3, activityType: "VISIT", customTitle: "Glodok", durationMinutes: 60, notes: null, place: null },
          { sequence: 4, activityType: "VISIT", customTitle: "Masjid Istiqlal", durationMinutes: 60, notes: null, place: null },
          { sequence: 5, activityType: "VISIT", customTitle: "Bundaran HI", durationMinutes: 60, notes: null, place: null },
          { sequence: 6, activityType: "VISIT", customTitle: "Taman Menteng", durationMinutes: 90, notes: null, place: null },
          { sequence: 7, activityType: "VISIT", customTitle: "Gelora Bung Karno", durationMinutes: 60, notes: null, place: null },
          { sequence: 8, activityType: "VISIT", customTitle: "Taman Suropati", durationMinutes: 60, notes: null, place: null },
        ],
      }],
      "Jakarta",
      "2026-11-01",
    ));
    expect(full[0].stops.every((stop) => stop.durationMinutes <= 75)).toBe(true);
    expect(visitWindowLabel(full[0].stops.at(-1)!.startTime, full[0].stops.at(-1)!.durationMinutes).slice(-5) >= "17:00").toBe(true);
    const picked = placeSummaryFromPick({ name: "Ancol", city: "Jakarta", latitude: -6.125, longitude: 106.833 });
    expect(picked.latitude).toBeCloseTo(-6.125, 3);
    const withCustom = appendVisitStop(days, "d1", { name: "Ancol", city: "Jakarta", latitude: -6.125, longitude: 106.833 });
    expect(withCustom[0].stops.at(-1)?.customTitle).toBe("Ancol");
    expect(withCustom[0].stops.at(-1)?.place?.latitude).toBeCloseTo(-6.125, 3);
    expect(withCustom[0].stops.at(-1)?.isLocked).toBe(true);
    const regenerated = mergeLockedStops(
      templateDaysToEditable(
        [{
          id: "d1",
          dayNumber: 1,
          title: "Hari 1",
          stops: [
            { sequence: 1, activityType: "VISIT", customTitle: "Monumen Nasional", durationMinutes: 90, notes: null, place: null },
            { sequence: 2, activityType: "VISIT", customTitle: "Kota Tua Jakarta", durationMinutes: 90, notes: null, place: null },
          ],
        }],
        "Jakarta",
        "2026-11-01",
      ),
      withCustom,
    );
    expect(regenerated[0].stops.some((stop) => stop.customTitle === "Ancol" && stop.isLocked)).toBe(true);
  });
});
