import { describe, expect, it } from "vitest";
import { haversineKm, orderStopsWithoutBacktrack, planEfficientDays, routeLengthKm, selectCompactStops } from "./route-optimize";
import { placeFromTemplateStop } from "./template-itinerary";

describe("route optimize", () => {
  it("does not send a Jawa Timur loop from Bromo to Ijen then back west", () => {
    const stops = [
      { name: "Gunung Bromo", lat: -7.9425, lng: 112.953 },
      { name: "Kawah Ijen", lat: -8.058, lng: 114.242 },
      { name: "Tumpak Sewu", lat: -8.2303, lng: 112.9167 },
      { name: "Taman Nasional Baluran", lat: -7.85, lng: 114.37 },
      { name: "Pantai Papuma", lat: -8.431, lng: 113.553 },
    ];
    const naive = routeLengthKm([stops[0]!, stops[1]!, stops[2]!, stops[3]!, stops[4]!]);
    const days = planEfficientDays(stops, 3, { lat: -7.2575, lng: 112.7521 });
    const optimized = routeLengthKm(days.flat());
    expect(days).toHaveLength(3);
    expect(optimized).toBeLessThan(naive);
    const bromoDay = days.find((day) => day.some((stop) => stop.name === "Gunung Bromo"));
    expect(bromoDay?.some((stop) => stop.name === "Kawah Ijen")).toBe(false);
    expect(haversineKm(stops[0]!, stops[2]!)).toBeLessThan(haversineKm(stops[0]!, stops[1]!));
  });

  it("keeps Tanah Lot on the west coast and Uluwatu on the Bukit peninsula", () => {
    const tanahLot = placeFromTemplateStop("Tanah Lot", "Bali");
    const uluwatu = placeFromTemplateStop("Uluwatu", "Bali");
    expect(tanahLot.latitude).toBeCloseTo(-8.62, 1);
    expect(uluwatu.latitude).toBeCloseTo(-8.83, 1);
    expect(tanahLot.longitude).not.toBe(uluwatu.longitude);
  });

  it("selects a compact Bandung corridor instead of jumping to Pangandaran", () => {
    const stops = [
      { name: "Gedung Sate", lat: -6.9025, lng: 107.6187 },
      { name: "Jalan Braga", lat: -6.9174, lng: 107.609 },
      { name: "Tebing Keraton", lat: -6.8352, lng: 107.663 },
      { name: "Kawah Putih", lat: -7.1662, lng: 107.4021 },
      { name: "Green Canyon Pangandaran", lat: -7.735, lng: 108.46 },
    ];
    const days = selectCompactStops(stops, 2, { lat: -6.9175, lng: 107.6191 }, { maxPerDay: 2, maxRadiusKm: 80 });
    const names = days.flat().map((stop) => stop.name).join(" ");
    expect(names).not.toMatch(/Pangandaran/i);
    expect(days.flat().length).toBeLessThanOrEqual(4);
  });

  it("orders Jakarta landmarks north-south so the route does not bounce back", () => {
    const stops = [
      { name: "Monumen Nasional", lat: -6.1754, lng: 106.8272 },
      { name: "Kota Tua Jakarta", lat: -6.1352, lng: 106.8133 },
      { name: "Bundaran HI", lat: -6.1944, lng: 106.8229 },
      { name: "Ancol", lat: -6.1256, lng: 106.8333 },
    ];
    const ordered = orderStopsWithoutBacktrack(stops, { lat: -6.2088, lng: 106.8456 });
    const lats = ordered.map((stop) => stop.lat);
    const goingSouth = lats.every((lat, index) => index === 0 || lat <= lats[index - 1]! + 0.002);
    const goingNorth = lats.every((lat, index) => index === 0 || lat >= lats[index - 1]! - 0.002);
    expect(goingSouth || goingNorth).toBe(true);
    expect(routeLengthKm(ordered)).toBeLessThan(
      routeLengthKm([stops[0]!, stops[1]!, stops[2]!, stops[3]!]),
    );
  });
});
