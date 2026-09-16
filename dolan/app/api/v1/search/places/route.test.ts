import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("GET /api/v1/search/places", () => {
  it("returns catalog suggestions in mock mode", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK_API", "true");
    const response = await GET(
      new Request("http://localhost/api/v1/search/places?q=Bandung"),
    );
    const json = (await response.json()) as {
      success: true;
      data: Array<{ name: string }>;
    };
    expect(json.success).toBe(true);
    expect(json.data.length).toBeGreaterThan(0);
    expect(json.data.some((place) => /bandung|braga|sate/i.test(place.name))).toBe(true);
  });

  it("falls back to catalog when the live proxy fails", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK_API", "false");
    vi.stubEnv("EXPRESS_ORIGIN", "");
    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/v1/search/places?q=Braga"));
    const json = (await response.json()) as { success: boolean; data: unknown[] };
    expect(json.success).toBe(true);
    expect(json.data.length).toBeGreaterThan(0);
  });

  it("returns the live proxy body when Express is healthy", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK_API", "false");
    vi.stubEnv("EXPRESS_ORIGIN", "http://127.0.0.1:4000");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: true, data: [{ name: "Live Braga" }] }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );
    const response = await GET(new Request("http://localhost/api/v1/search/places?q=Braga&city=Bandung"));
    const json = (await response.json()) as { data: Array<{ name: string }> };
    expect(json.data[0]?.name).toBe("Live Braga");
  });
});
