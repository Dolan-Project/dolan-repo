import { describe, expect, it } from "vitest";
import { buildDestinationItinerary, buildProvinceTemplateDays, destinationCoverUrl, destinationStopSeeds, findProvinceForDestination, resolveTripItineraryDays, templateMatchesDestination } from "./destination-itinerary";
import { describeTransportLeg, estimateItineraryBudget, visitWindowLabel } from "./template-itinerary";
import { INDONESIA_PROVINCES } from "./provinces";

describe("destination itinerary", () => {
  it("builds Bandung stops instead of Komodo defaults", () => {
    const days = buildDestinationItinerary({
      destination: "Bandung",
      startDate: "2026-11-01",
      endDate: "2026-11-02",
    });
    const names = days.flatMap((day) => day.stops.map((stop) => stop.customTitle)).join(" ");
    expect(names).toMatch(/Gedung Sate|Braga/i);
    expect(names).not.toMatch(/Pink Beach|Bandara Komodo|Padar|Bogor|Pangandaran/i);
    expect(days[0].stops.length).toBeGreaterThanOrEqual(5);
    expect(days[0].stops[0].startTime).toBe("08:00");
    expect(days[0].stops.every((stop) => stop.durationMinutes <= 75)).toBe(true);
    const last = days[0].stops.at(-1)!;
    expect(last.startTime! >= "14:00").toBe(true);
    expect(visitWindowLabel(last.startTime, last.durationMinutes).slice(-5) >= "17:00").toBe(true);
    expect(days.every((day) => day.stops.length >= 2)).toBe(true);
    expect(days[0].stops[0].place?.latitude).toBeCloseTo(-6.9, 0);
    expect(findProvinceForDestination("Bandung")?.name).toBe("Jawa Barat");
    expect(templateMatchesDestination("Nusa Tenggara Timur", "Bandung")).toBe(false);
    expect(templateMatchesDestination("Jawa Barat", "Bandung")).toBe(true);
  });

  it("keeps Jawa Barat province trips wider than a Bandung city trip", () => {
    const provinceDays = buildDestinationItinerary({
      destination: "Jawa Barat",
      startDate: "2026-11-01",
      endDate: "2026-11-03",
    });
    const names = provinceDays.flatMap((day) => day.stops.map((stop) => stop.customTitle)).join(" ");
    expect(names).toMatch(/Tangkuban|Kawah Putih|Bogor|Situ Patenggang/i);
    expect(provinceDays.every((day) => day.stops.length >= 2)).toBe(true);
    const mixedFar = provinceDays.some((day) => {
      const dayNames = day.stops.map((stop) => stop.customTitle ?? "").join(" ");
      return /Pangandaran/i.test(dayNames) && /Gedung Sate|Braga|Alun-Alun Bandung/i.test(dayNames);
    });
    expect(mixedFar).toBe(false);
  });

  it("uses a destination-related cover, not the generic Komodo fallback", () => {
    expect(destinationCoverUrl("Bandung")).toMatch(/bandung/i);
    expect(destinationStopSeeds("Yogyakarta").some((stop) => /Keraton/i.test(stop.name))).toBe(true);
  });

  it("replaces Komodo mock days when the trip destination is Bandung", () => {
    const komodo = buildDestinationItinerary({ destination: "Labuan Bajo", startDate: "2026-11-01", endDate: "2026-11-02" });
    const resolved = resolveTripItineraryDays({
      destination: "Bandung",
      startDate: "2026-11-01",
      endDate: "2026-11-02",
      days: komodo,
    });
    const names = resolved.flatMap((day) => day.stops.map((stop) => stop.customTitle)).join(" ");
    expect(names).toMatch(/Gedung Sate|Braga/i);
    expect(names).not.toMatch(/Pink Beach|Padar|Bogor|Pangandaran/i);
  });

  it("builds a province template itinerary with map coordinates", () => {
    const province = INDONESIA_PROVINCES.find((item) => item.slug === "jawa-barat")!;
    const days = buildProvinceTemplateDays(province);
    expect(days.length).toBeGreaterThan(0);
    expect(days[0].stops[0].place?.latitude).toBeTypeOf("number");
    expect(days.every((day) => day.stops.length >= 2)).toBe(true);
    expect(days.flatMap((day) => day.stops).length).toBeGreaterThanOrEqual(province.template.stops.length);
  });

  it("places Bromo on the Tengger caldera, not Surabaya, and keeps Ijen on a different day", () => {
    const province = INDONESIA_PROVINCES.find((item) => item.slug === "jawa-timur")!;
    const days = buildProvinceTemplateDays(province);
    const bromo = days.flatMap((day) => day.stops).find((stop) => /bromo/i.test(stop.customTitle ?? ""));
    const ijen = days.flatMap((day) => day.stops).find((stop) => /ijen/i.test(stop.customTitle ?? ""));
    expect(bromo?.place?.latitude).toBeCloseTo(-7.94, 1);
    expect(bromo?.place?.longitude).toBeCloseTo(112.95, 1);
    expect(ijen?.place?.latitude).toBeCloseTo(-8.06, 1);
    expect(ijen?.place?.longitude).toBeCloseTo(114.24, 1);
    const bromoDay = days.find((day) => day.stops.some((stop) => /bromo/i.test(stop.customTitle ?? "")));
    expect(bromoDay?.stops.some((stop) => /ijen/i.test(stop.customTitle ?? ""))).toBe(false);
  });

  it("maps Gunung Bromo and Cemoro Lawang to the caldera, not a city center", () => {
    const bromo = destinationStopSeeds("Gunung Bromo");
    const cemoro = destinationStopSeeds("Cemoro Lawang");
    expect(bromo.some((stop) => Math.abs(stop.lat - -7.94) < 0.08)).toBe(true);
    expect(cemoro.some((stop) => Math.abs(stop.lat - -7.94) < 0.08)).toBe(true);
    expect(bromo.every((stop) => Math.abs(stop.lat - -7.2575) > 0.3)).toBe(true);
  });

  it("keeps Bandung AI routes inside a compact corridor and regenerate picks different places", () => {
    const first = buildDestinationItinerary({
      destination: "Bandung",
      startDate: "2026-11-01",
      endDate: "2026-11-02",
    });
    const names = first.flatMap((day) => day.stops.map((stop) => stop.customTitle ?? "")).join(" ");
    expect(names).not.toMatch(/Pangandaran|Bogor/i);
    expect(first[0].stops.length).toBeGreaterThanOrEqual(5);
    expect(first[0].stops.every((stop) => stop.durationMinutes <= 75)).toBe(true);
    expect(first[0].stops[0].place?.googleMapsUrl).toMatch(/maps/i);
    const used = first.flatMap((day) => day.stops.map((stop) => stop.customTitle || ""));
    const next = buildDestinationItinerary({
      destination: "Bandung",
      startDate: "2026-11-01",
      endDate: "2026-11-02",
      variant: 1,
      excludeNames: used,
    });
    const nextNames = next.flatMap((day) => day.stops.map((stop) => stop.customTitle ?? ""));
    expect(nextNames.join(" ")).not.toBe(used.join(" "));
  });

  it("orders Jakarta stops along a north-south corridor instead of zigzagging", () => {
    const days = buildDestinationItinerary({
      destination: "Jakarta",
      startDate: "2026-11-01",
      endDate: "2026-11-01",
    });
    const lats = days[0].stops.map((stop) => stop.place?.latitude ?? 0);
    const goingSouth = lats.every((lat, index) => index === 0 || lat <= lats[index - 1]! + 0.004);
    const goingNorth = lats.every((lat, index) => index === 0 || lat >= lats[index - 1]! - 0.004);
    expect(goingSouth || goingNorth).toBe(true);
    expect(days[0].stops.length).toBeGreaterThanOrEqual(7);
    expect(days[0].stops.every((stop) => stop.durationMinutes <= 75)).toBe(true);
    expect(days[0].stops.map((stop) => stop.customTitle).join(" → ")).toMatch(/Ancol|Kota Tua|Monumen|Bundaran HI|Istiqlal|Menteng/i);
    const names = days[0].stops.map((stop) => stop.customTitle);
    expect(new Set(names).size).toBe(names.length);
    const lastJakarta = days[0].stops.at(-1)!;
    expect(visitWindowLabel(lastJakarta.startTime, lastJakarta.durationMinutes).slice(-5) >= "17:00").toBe(true);
    const kotaTua = days[0].stops.findIndex((stop) => /Kota Tua/i.test(stop.customTitle ?? ""));
    if (kotaTua > 0) {
      const previous = days[0].stops[kotaTua - 1]!;
      const current = days[0].stops[kotaTua]!;
      const leg = describeTransportLeg(
        { lat: previous.place!.latitude, lng: previous.place!.longitude },
        { lat: current.place!.latitude, lng: current.place!.longitude },
        { destinationName: current.customTitle ?? "" },
      );
      expect(leg.mode).not.toMatch(/jalan kaki/i);
      expect(leg.amount).toBeGreaterThan(0);
    }
  });

  it("drops paid Jakarta stops when preferCheaper is on", () => {
    const cheap = buildDestinationItinerary({
      destination: "Jakarta",
      startDate: "2026-11-01",
      endDate: "2026-11-01",
      preferCheaper: true,
    });
    const names = cheap.flatMap((day) => day.stops.map((stop) => stop.customTitle)).join(" ");
    expect(names).not.toMatch(/Ancol/i);
    expect(names).toMatch(/Kota Tua|Monumen|Bundaran HI/i);
  });

  it("fits a tight Jakarta budget after cheaper regenerate", () => {
    const days = buildDestinationItinerary({
      destination: "Jakarta",
      startDate: "2026-11-01",
      endDate: "2026-11-02",
      preferCheaper: true,
      budgetPool: 700_000,
      partySize: 2,
    });
    const plan = estimateItineraryBudget(days, 700_000, 2);
    expect(plan.total).toBeLessThanOrEqual(700_000);
    expect(days.every((day) => day.stops.length >= 2)).toBe(true);
  });

  it("keeps Jambi template days in nearby corridors and fills a full day", () => {
    const province = INDONESIA_PROVINCES.find((item) => item.slug === "jambi")!;
    const days = buildProvinceTemplateDays(province);
    expect(days.every((day) => day.stops.length >= 2)).toBe(true);
    const mixed = days.some((day) => {
      const names = day.stops.map((stop) => stop.customTitle ?? "").join(" ");
      return /Muaro Jambi|Gentala/i.test(names) && /Kerinci|Kayu Aro/i.test(names);
    });
    expect(mixed).toBe(false);
    expect(days.flatMap((day) => day.stops).map((stop) => stop.sequence)).toEqual(
      days.flatMap((day) => day.stops).map((_, index) => index + 1),
    );
  });

  it("fills a lesser-known destination with more than one stop from morning to evening", () => {
    const days = buildDestinationItinerary({
      destination: "Palu",
      startDate: "2026-11-01",
      endDate: "2026-11-01",
    });
    expect(days[0].stops.length).toBeGreaterThanOrEqual(7);
    expect(days[0].stops.every((stop) => stop.durationMinutes <= 75)).toBe(true);
    expect(days[0].stops[0].startTime).toBe("08:00");
    const last = days[0].stops.at(-1)!;
    expect(visitWindowLabel(last.startTime, last.durationMinutes).slice(-5) >= "17:00").toBe(true);
  });
});
