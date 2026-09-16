import { describe, expect, it } from "vitest";
import { buildDestinationItinerary, buildProvinceTemplateDays, clampItineraryToDestination, destinationCoverUrl, destinationStopSeeds, ensureMultiStopDays, findProvinceForDestination, resolveTripItineraryDays, templateMatchesDestination } from "./destination-itinerary";
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
    const last = days[0].stops.at(-1)!;
    expect(last.startTime! >= "14:00").toBe(true);
    const lastStart = Number(last.startTime!.slice(0, 2)) * 60 + Number(last.startTime!.slice(3));
    expect(lastStart + last.durationMinutes).toBeGreaterThanOrEqual(18 * 60);
    expect(days[0].stops.every((stop) => !/warung|resto|cafe/i.test(stop.customTitle ?? "") || stop.durationMinutes <= 75)).toBe(true);
    expect(days[0].stops[0].place?.latitude).toBeCloseTo(-6.9, 0);
    expect(findProvinceForDestination("Bandung")?.name).toBe("Jawa Barat");
    expect(templateMatchesDestination("Nusa Tenggara Timur", "Bandung")).toBe(false);
    expect(templateMatchesDestination("Jawa Barat", "Bandung")).toBe(true);
  });

  it("does not treat Jawa Barat the province as a tourist stop", () => {
    const seeds = destinationStopSeeds("Jawa Barat");
    expect(seeds.every((stop) => stop.name.toLocaleLowerCase("id-ID") !== "jawa barat")).toBe(true);
    expect(seeds.some((stop) => /Gedung Sate|Braga|Bogor|Kebun Raya/i.test(stop.name))).toBe(true);
    const days = buildDestinationItinerary({
      destination: "Jawa Barat",
      startDate: "2026-11-01",
      endDate: "2026-11-03",
    });
    const names = days.flatMap((day) => day.stops.map((stop) => stop.customTitle)).join(" ");
    expect(names.toLocaleLowerCase("id-ID")).not.toMatch(/(^| )jawa barat( |$)/);
    expect(names).toMatch(/Gedung Sate|Braga|Bogor|Kebun Raya/i);
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
    expect(days.flatMap((day) => day.stops).length).toBe(province.template.stops.length);
  });

  it("keeps curated province stops on the JSON day, not stacked on day 1", () => {
    const province = INDONESIA_PROVINCES.find((item) => item.slug === "jawa-barat")!;
    const days = buildProvinceTemplateDays(province);
    const expected = Array.from({ length: province.template.durationDays }, (_, dayIndex) =>
      province.template.stops.filter((stop) => stop.day === dayIndex + 1).map((stop) => stop.name),
    );
    expect(days).toHaveLength(expected.length);
    expect(days.map((day) => day.stops.map((stop) => stop.customTitle))).toEqual(expected);
    expect(days[0].stops[0].startTime).toBe("08:00");
    expect(days[2].stops[0].startTime).toBe("05:30");
    expect(days[0].stops.some((stop) => /kawah putih|situ patenggang/i.test(stop.customTitle ?? ""))).toBe(false);
  });

  it("places Bromo on the Tengger caldera, not Surabaya, on its curated day", () => {
    const province = INDONESIA_PROVINCES.find((item) => item.slug === "jawa-timur")!;
    const days = buildProvinceTemplateDays(province);
    const bromo = days.flatMap((day) => day.stops).find((stop) => /kawah bromo/i.test(stop.customTitle ?? ""));
    expect(bromo?.place?.latitude).toBeCloseTo(-7.94, 1);
    expect(bromo?.place?.longitude).toBeCloseTo(112.95, 1);
    const bromoDay = days.find((day) => day.stops.some((stop) => /kawah bromo/i.test(stop.customTitle ?? "")));
    expect(bromoDay?.dayNumber).toBe(2);
    expect(bromoDay?.stops[0]?.customTitle).toMatch(/Penanjakan|Bromo Sunrise/i);
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
    expect(first[0].stops.length).toBeGreaterThanOrEqual(3);
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

  it("builds Sumatera Utara with multi-stop days instead of one landmark per day", () => {
    const days = buildDestinationItinerary({
      destination: "Sumatera Utara",
      startDate: "2026-11-01",
      endDate: "2026-11-02",
    });
    expect(days.length).toBeGreaterThanOrEqual(2);
    expect(days.every((day) => day.stops.length >= 2)).toBe(true);
    const names = days.flatMap((day) => day.stops.map((stop) => stop.customTitle)).join(" ");
    expect(names).toMatch(/Maimun|Kesawan|Petisah|Mashun|Tjong/i);
  });

  it("keeps Medan city trips inside Medan — not Bandung/Cihampelas/Cimahi", () => {
    const days = buildDestinationItinerary({
      destination: "Medan",
      startDate: "2026-11-01",
      endDate: "2026-11-02",
    });
    const names = days.flatMap((day) => day.stops.map((stop) => stop.customTitle ?? "")).join(" ");
    expect(names).toMatch(/Maimun|Kesawan|Petisah|Mashun|Tjong|Juang/i);
    expect(names).not.toMatch(/Cihampelas|Cimahi|Braga|Gedung Sate|Bandung|Bogor|Malioboro|Jakarta|Monas/i);
    expect(days.every((day) => day.stops.length >= 2)).toBe(true);
    for (const day of days) {
      for (const stop of day.stops) {
        const lat = stop.place?.latitude ?? 0;
        const lng = stop.place?.longitude ?? 0;
        expect(lat).toBeGreaterThan(3.4);
        expect(lat).toBeLessThan(3.8);
        expect(lng).toBeGreaterThan(98.5);
        expect(lng).toBeLessThan(98.9);
      }
    }
  });

  it("keeps 4-day Medan trips at 2+ nearby stops per day, never 1 landmark all day", () => {
    const days = buildDestinationItinerary({
      destination: "Medan",
      startDate: "2026-11-01",
      endDate: "2026-11-04",
    });
    expect(days).toHaveLength(4);
    expect(days.every((day) => day.stops.length >= 2)).toBe(true);
    const names = days.flatMap((day) => day.stops.map((stop) => stop.customTitle ?? "")).join(" ");
    expect(names).not.toMatch(/Cimahi|Cihampelas|Bandung|Jakarta/i);
  });

  it("fills a one-stop Medan day with nearby Medan places, not far cities", () => {
    const thin = buildDestinationItinerary({
      destination: "Medan",
      startDate: "2026-11-01",
      endDate: "2026-11-01",
    }).map((day) => ({ ...day, stops: day.stops.slice(0, 1) }));
    const filled = ensureMultiStopDays(thin, "Medan");
    expect(filled[0]?.stops.length).toBeGreaterThanOrEqual(2);
    const names = filled.flatMap((day) => day.stops.map((stop) => stop.customTitle ?? "")).join(" ");
    expect(names).not.toMatch(/Cimahi|Cihampelas|Bandung|Jakarta|Malioboro/i);
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
    expect(days[0].stops.map((stop) => stop.customTitle).join(" ")).toMatch(/Bundaran HI|Monumen|Kota Tua|Ancol/i);
  });

  it("builds a 3-day Yogyakarta trip with multi-stop days and non-zero transport for later stops", async () => {
    const { estimateItineraryBudget } = await import("./template-itinerary");
    const days = buildDestinationItinerary({
      destination: "Yogyakarta",
      startDate: "2026-11-01",
      endDate: "2026-11-03",
    });
    expect(days).toHaveLength(3);
    const multiStopDays = days.filter((day) => day.stops.length >= 2);
    expect(multiStopDays.length).toBeGreaterThanOrEqual(2);
    const secondStops = multiStopDays.flatMap((day) => day.stops.slice(1));
    expect(secondStops.some((stop) => (stop.travelDurationMinutes ?? 0) > 0)).toBe(true);
    const plan = estimateItineraryBudget(days, 5_000_000, 1);
    const transportLines = Object.values(plan.byStopId).flatMap((item) => item.lines.filter((line) => line.key === "transport"));
    expect(transportLines.some((line) => line.amount > 0)).toBe(true);
    expect(transportLines.some((line) => /Titik awal hari/i.test(line.detail))).toBe(true);
    expect(transportLines.every((line) => !/estimasi kasar|belum ada rute/i.test(line.detail))).toBe(true);
    expect(transportLines.some((line) => line.amount > 0 && /ojek|mobil|jeep|jalan kaki|kapal/i.test(line.detail))).toBe(true);
  });

  it("builds Cirebon with local stops, not an empty or Bandung itinerary", () => {
    const days = buildDestinationItinerary({
      destination: "Cirebon",
      startDate: "2026-11-01",
      endDate: "2026-11-02",
    });
    const names = days.flatMap((day) => day.stops.map((stop) => stop.customTitle)).join(" ");
    expect(days.length).toBeGreaterThanOrEqual(1);
    expect(days.every((day) => day.stops.length >= 2)).toBe(true);
    expect(names).toMatch(/Kasepuhan|Sunyaragi|Trusmi|Kejawanan|Kanoman/i);
    expect(names).not.toMatch(/Gedung Sate|Braga|Pink Beach|Padar|Komodo/i);
    for (const stop of days.flatMap((day) => day.stops)) {
      expect(stop.place?.latitude).toBeGreaterThan(-7.1);
      expect(stop.place?.latitude).toBeLessThan(-6.5);
      expect(stop.place?.longitude).toBeGreaterThan(108.4);
      expect(stop.place?.longitude).toBeLessThan(108.7);
    }
  });

  it("keeps Bali itineraries inside Bali and drops NTT leaks", () => {
    const days = buildDestinationItinerary({
      destination: "Bali",
      startDate: "2026-11-01",
      endDate: "2026-11-03",
    });
    const names = days.flatMap((day) => day.stops.map((stop) => stop.customTitle)).join(" ");
    expect(names).toMatch(/Tanah Lot|Uluwatu|Ubud|Sanur|Kuta|Tirta|GWK|Garuda/i);
    expect(names).not.toMatch(/Pink Beach|Padar|Komodo|Labuan Bajo|Kelimutu/i);
    const leaked = clampItineraryToDestination(
      [{
        id: "d1",
        dayNumber: 1,
        date: "2026-11-01",
        title: "Hari 1",
        stops: [
          { id: "s1", sequence: 1, place: { googlePlaceId: "x", name: "Pulau Padar", formattedAddress: "NTT", city: "Labuan Bajo", latitude: -8.6486, longitude: 119.5892, rating: null, userRatingCount: null, photoName: null, googleMapsUrl: "" }, customTitle: "Pulau Padar", activityType: "Wisata", startTime: "08:00", durationMinutes: 60, travelDurationMinutes: 0, notes: null, isLocked: false },
          { id: "s2", sequence: 2, place: { googlePlaceId: "y", name: "Pink Beach", formattedAddress: "NTT", city: "Labuan Bajo", latitude: -8.6031, longitude: 119.5196, rating: null, userRatingCount: null, photoName: null, googleMapsUrl: "" }, customTitle: "Pink Beach", activityType: "Wisata", startTime: "10:00", durationMinutes: 60, travelDurationMinutes: 0, notes: null, isLocked: false },
        ],
      }],
      "Bali",
    );
    const leakedNames = leaked.flatMap((day) => day.stops.map((stop) => stop.customTitle)).join(" ");
    expect(leakedNames).not.toMatch(/Padar|Pink Beach|Komodo/i);
    expect(leakedNames).toMatch(/Tanah Lot|Uluwatu|Ubud|Sanur|Kuta|Tirta|Garuda/i);
  });
});
