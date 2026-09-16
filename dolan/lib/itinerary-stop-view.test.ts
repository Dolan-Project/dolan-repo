import { describe, expect, it } from "vitest";
import {
  activityTypeLabel,
  analyzeStopTravel,
  formatTravelToStop,
  itineraryListNumbers,
  minutesForVehicleKm,
  roundEstimateRupiah,
  sanitizeStopNotes,
  stopDisplayNumber,
  stopPinColorIndex,
  stopPlaceHeading,
  planDayVisitDurations,
  suggestedVisitMinutes,
  ticketLineDetail,
  TOTAL_ESTIMATE_LABEL,
  visitWindowSummary,
  formatItineraryDateRange,
  itinerarySourceLabel,
  itineraryVersionOptionLabel,
} from "./itinerary-stop-view";
import type { EditableItineraryStop } from "@dolan/shared";

function stop(patch: Partial<EditableItineraryStop> = {}): EditableItineraryStop {
  return {
    id: "s1",
    sequence: 1,
    place: null,
    customTitle: "Tanah Lot",
    activityType: "VISIT",
    startTime: "09:35",
    durationMinutes: 60,
    travelDurationMinutes: null,
    notes: null,
    isLocked: false,
    ...patch,
  };
}

const tanahLot = stop({
  id: "a",
  sequence: 1,
  customTitle: "Tanah Lot",
  place: {
    googlePlaceId: "tanah-lot",
    name: "Tanah Lot",
    formattedAddress: "Bali",
    city: "Bali",
    latitude: -8.6211,
    longitude: 115.0868,
    rating: null,
    userRatingCount: null,
    photoName: null,
    googleMapsUrl: "",
  },
});

const uluwatu = stop({
  id: "b",
  sequence: 2,
  customTitle: "Uluwatu",
  place: {
    googlePlaceId: "uluwatu",
    name: "Uluwatu",
    formattedAddress: "Bali",
    city: "Bali",
    latitude: -8.8291,
    longitude: 115.085,
    rating: null,
    userRatingCount: null,
    photoName: null,
    googleMapsUrl: "",
  },
});

describe("itinerary stop view", () => {
  it("uses the same global sequence for list number and pin color", () => {
    expect(stopDisplayNumber({ sequence: 4 }, 0)).toBe(4);
    expect(stopPinColorIndex({ sequence: 4 }, 0)).toBe(3);
    expect(stopDisplayNumber({ sequence: 0 }, 2)).toBe(3);
  });

  it("keeps visit duration aligned with the ideal window", () => {
    const visit = visitWindowSummary("09:35", 60);
    expect(visit.duration).toBe(60);
    expect(visit.window).toBe("09:35–10:35");
    expect(visit.label).toBe("09:35–10:35 · 60 mnt");
  });

  it("derives vehicle and duration from the distance between two stops", () => {
    const travel = analyzeStopTravel(uluwatu, tanahLot, false);
    expect(travel).not.toBeNull();
    expect(travel!.km).toBeGreaterThan(20);
    expect(travel!.vehicle).toBe("drive");
    expect(travel!.minutes).toBe(minutesForVehicleKm(travel!.km, travel!.vehicle));
    expect(travel!.minutes).toBeGreaterThan(40);
    const impliedKmh = travel!.km / (travel!.minutes / 60);
    expect(impliedKmh).toBeGreaterThan(15);
    expect(impliedKmh).toBeLessThan(55);
    expect(formatTravelToStop(uluwatu, tanahLot, false)).toMatch(/Mobil/);
    expect(formatTravelToStop(uluwatu, tanahLot, false)).toMatch(/mnt|jam/);
    expect(formatTravelToStop(uluwatu, tanahLot, false)).not.toMatch(/estimasi kasar|belum ada rute/i);
    expect(formatTravelToStop(uluwatu, tanahLot, true)).toBeNull();
  });

  it("ignores stored travelDurationMinutes and times the leg from distance", () => {
    const fakeMinutes = stop({
      ...uluwatu,
      routeStatus: "AVAILABLE",
      travelDurationMinutes: 12,
      travelDistanceMeters: 40_000,
    });
    const travel = analyzeStopTravel(fakeMinutes, tanahLot, false);
    expect(travel).not.toBeNull();
    expect(travel!.km).toBeCloseTo(40, 5);
    expect(travel!.minutes).toBe(minutesForVehicleKm(40, travel!.vehicle));
    expect(travel!.minutes).not.toBe(12);
    expect(travel!.minutes).toBeGreaterThan(50);
    expect(formatTravelToStop(fakeMinutes, tanahLot, false)).not.toMatch(/12 mnt/);
  });

  it("uses Maps road distance for km, not the stored duration", () => {
    const bromo = stop({
      customTitle: "Gunung Bromo",
      routeStatus: "AVAILABLE",
      travelDistanceMeters: 18_000,
      travelDurationMinutes: 42,
      place: {
        googlePlaceId: "bromo",
        name: "Gunung Bromo",
        formattedAddress: "Jawa Timur",
        city: "Probolinggo",
        latitude: -7.9425,
        longitude: 112.953,
        rating: null,
        userRatingCount: null,
        photoName: null,
        googleMapsUrl: "",
      },
    });
    const travel = analyzeStopTravel(bromo, tanahLot, false);
    expect(travel!.vehicle).toBe("jeep");
    expect(travel!.km).toBeCloseTo(18, 5);
    expect(travel!.minutes).toBe(minutesForVehicleKm(18, "jeep"));
    expect(travel!.minutes).not.toBe(42);
    expect(formatTravelToStop(bromo, tanahLot, false)).toBe(travel!.label);
    expect(travel!.label).not.toMatch(/42 mnt/);
  });

  it("uses a mountain visit length for large-area parks", () => {
    expect(suggestedVisitMinutes("Taman Nasional Komodo", 45)).toBeGreaterThanOrEqual(180);
    expect(stopPlaceHeading(stop({ customTitle: "Gunung Bromo" })).subLocation).toMatch(/Penanjakan/);
  });

  it("keeps meals short and stretches attractions toward evening", () => {
    expect(suggestedVisitMinutes("Warung Nasi", 300)).toBeLessThanOrEqual(75);
    expect(suggestedVisitMinutes("Gedung Sate", 90)).toBeGreaterThan(75);
    const durations = planDayVisitDurations({
      names: ["Gedung Sate", "Museum Geologi Bandung", "Jalan Braga", "Taman Lansia", "Cihampelas Walk"],
      startMinutes: 8 * 60,
      travelMinutes: [0, 15, 15, 15, 15],
    });
    expect(durations.every((minutes) => minutes <= 180)).toBe(true);
    const end = durations.reduce((cursor, minutes, index) => cursor + (index === 0 ? 0 : 15) + minutes, 8 * 60);
    expect(end).toBeGreaterThanOrEqual(19 * 60);
    const meal = planDayVisitDurations({
      names: ["Warung Nasi", "Gedung Sate", "Museum Geologi Bandung"],
      startMinutes: 8 * 60,
      travelMinutes: [0, 15, 15],
    });
    expect(meal[0]).toBeLessThanOrEqual(75);
  });

  it("strips system notes and labels tickets as unverified estimates", () => {
    expect(sanitizeStopNotes("Detail foto, rating, alamat... ditampilkan dari Google Places")).toBeNull();
    expect(sanitizeStopNotes("Sunset di pura tepi laut.")).toBe("Sunset di pura tepi laut.");
    expect(ticketLineDetail("Tanah Lot", 2)).toMatch(/perlu dicek di lokasi/);
    expect(TOTAL_ESTIMATE_LABEL).toMatch(/tiket & transportasi/);
    expect(activityTypeLabel("VISIT")).toBe("Kunjungan");
    expect(roundEstimateRupiah(613_642)).toBe(614_000);
  });

  it("formats editor dates and version options in plain Indonesian", () => {
    expect(formatItineraryDateRange("2026-09-17", "2026-09-21")).toBe("17 Sep 2026 - 21 Sep 2026");
    expect(itinerarySourceLabel("MANUAL")).toBe("Disusun manual");
    expect(itineraryVersionOptionLabel(2, "MANUAL", true)).toBe("Versi 2 - Disusun manual - Sedang dipakai");
    expect(itineraryVersionOptionLabel(1, "AI", false)).toBe("Versi 1 - Dari Dolan");
  });

  it("maps list ids to display numbers in order", () => {
    expect(itineraryListNumbers([
      {
        id: "d1",
        dayNumber: 1,
        date: "2026-11-01",
        title: "Hari 1",
        stops: [stop({ id: "a", sequence: 1 }), stop({ id: "b", sequence: 2, customTitle: "Uluwatu" })],
      },
    ]).map((item) => item.number)).toEqual([1, 2]);
  });
});
