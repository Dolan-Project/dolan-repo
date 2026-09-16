import { describe, expect, it } from "vitest";
import { GeminiAdapter, GEMINI_ITINERARY_RESPONSE_SCHEMA } from "../src/modules/jobs/gemini-adapter.ts";

describe("GeminiAdapter", () => {
  it("sends structured output schema and trip preferences", async () => {
    let body: Record<string, unknown> = {};
    const adapter = new GeminiAdapter("test-key", "gemini-2.0-flash", async (_url, init) => {
      body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: JSON.stringify({ summary: null, assumptions: [], days: [], budgetItems: [] }) }] } }],
        }),
        { status: 200 },
      );
    });

    await adapter.generate({ tripId: "trip-1", preferences: { city: "Yogyakarta" } });
    const config = body.generationConfig as { responseMimeType: string; responseSchema: unknown };
    expect(config.responseMimeType).toBe("application/json");
    expect(config.responseSchema).toEqual(GEMINI_ITINERARY_RESPONSE_SCHEMA);
    const text = (body.contents as Array<{ parts: Array<{ text: string }> }>)[0]?.parts[0]?.text;
    expect(text).toContain("Yogyakarta");
    expect(text).toContain("Jangan hitung total budget");
  });
});
