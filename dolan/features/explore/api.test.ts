import { afterEach, describe, expect, it, vi } from "vitest";
import { searchExplore } from "./api";

const emptyPage = {
  success: true,
  data: [],
  pagination: {
    page: 1,
    limit: 8,
    totalItems: 0,
    totalPages: 0,
    hasNextPage: false,
  },
};

describe("explore API client", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("sends map coordinates and place sort to the public place search", async () => {
    const request = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(emptyPage), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", request);

    await searchExplore({
      tab: "wisata",
      query: "Labuan Bajo",
      category: "pantai",
      sort: "nearest",
      center: { lat: -8.49, lng: 119.88 },
    });

    const url = new URL(String(request.mock.calls[0]?.[0]));
    expect(url.pathname).toBe("/api/v1/search/places");
    expect(url.searchParams.get("q")).toBe("Labuan Bajo pantai");
    expect(url.searchParams.get("sort")).toBe("nearest");
    expect(url.searchParams.get("lat")).toBe("-8.49");
    expect(url.searchParams.get("lng")).toBe("119.88");
  });

  it("uses the public trip search with date filters", async () => {
    const request = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(emptyPage), { status: 200 }),
    );
    vi.stubGlobal("fetch", request);

    await searchExplore({
      tab: "trip",
      query: "Yogyakarta",
      sort: "popular",
      dateFrom: "2026-10-10",
      dateTo: "2026-10-12",
      page: 2,
    });

    const url = new URL(String(request.mock.calls[0]?.[0]));
    expect(url.pathname).toBe("/api/v1/search/trips");
    expect(url.searchParams.get("city")).toBe("Yogyakarta");
    expect(url.searchParams.get("q")).toBeNull();
    expect(url.searchParams.get("sort")).toBe("popular");
    expect(url.searchParams.get("dateFrom")).toBe("2026-10-10");
    expect(url.searchParams.get("dateTo")).toBe("2026-10-12");
    expect(url.searchParams.get("page")).toBe("2");
  });

  it("sends soonest and nearest trip sorts with coordinates when needed", async () => {
    const request = vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(JSON.stringify(emptyPage), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );
    vi.stubGlobal("fetch", request);

    await searchExplore({
      tab: "trip",
      query: "Bali",
      sort: "soonest",
    });
    await searchExplore({
      tab: "trip",
      query: "Bali",
      sort: "nearest",
      center: { lat: -8.65, lng: 115.22 },
    });

    const soonestUrl = new URL(String(request.mock.calls[0]?.[0]));
    expect(soonestUrl.searchParams.get("sort")).toBe("soonest");
    expect(soonestUrl.searchParams.get("lat")).toBeNull();

    const nearestUrl = new URL(String(request.mock.calls[1]?.[0]));
    expect(nearestUrl.searchParams.get("sort")).toBe("nearest");
    expect(nearestUrl.searchParams.get("lat")).toBe("-8.65");
    expect(nearestUrl.searchParams.get("lng")).toBe("115.22");
  });

  it("loads published templates through the templates endpoint", async () => {
    const request = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(emptyPage), { status: 200 }),
    );
    vi.stubGlobal("fetch", request);

    await searchExplore({
      tab: "template",
      query: "Bandung",
      sort: "recent",
    });

    const url = new URL(String(request.mock.calls[0]?.[0]));
    expect(url.pathname).toBe("/api/v1/templates");
    expect(url.searchParams.get("city")).toBe("Bandung");
    expect(url.searchParams.get("sort")).toBe("recent");
  });
});
