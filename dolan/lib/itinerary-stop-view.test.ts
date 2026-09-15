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
  suggestedVisitMinutes,
  ticketLineDetail,
  TOTAL_ESTIMATE_LABEL,
  visitWindowSummary,
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
    expect(["ojek", "drive"]).toContain(travel!.vehicle);
    expect(travel!.minutes).toBe(minutesForVehicleKm(travel!.km, travel!.vehicle));
    expect(formatTravelToStop(uluwatu, tanahLot, false)).toMatch(/Ojek|Mobil/);
    expect(formatTravelToStop(uluwatu, tanahLot, false)).toMatch(/mnt|jam/);
    expect(formatTravelToStop(uluwatu, tanahLot, false)).not.toMatch(/estimasi kasar|belum ada rute/i);
    expect(formatTravelToStop(uluwatu, tanahLot, true)).toBeNull();
  });

  it("prefers routing minutes when Google marks the leg available", () => {
    expect(formatTravelToStop(stop({
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
    }), tanahLot, false)).toBe("Jeep · 18,0 km · 42 mnt");
  });

  it("uses a mountain visit length for large-area parks", () => {
    expect(suggestedVisitMinutes("Taman Nasional Komodo", 45)).toBeGreaterThanOrEqual(180);
    expect(stopPlaceHeading(stop({ customTitle: "Gunung Bromo" })).subLocation).toMatch(/Penanjakan/);
  });

  it("strips system notes and labels tickets as unverified estimates", () => {
    expect(sanitizeStopNotes("Detail foto, rating, alamat... ditampilkan dari Google Places")).toBeNull();
    expect(sanitizeStopNotes("Sunset di pura tepi laut.")).toBe("Sunset di pura tepi laut.");
    expect(ticketLineDetail("Tanah Lot", 2)).toMatch(/perlu dicek di lokasi/);
    expect(TOTAL_ESTIMATE_LABEL).toMatch(/tiket & transportasi/);
    expect(activityTypeLabel("VISIT")).toBe("Kunjungan");
    expect(roundEstimateRupiah(613_642)).toBe(614_000);
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
