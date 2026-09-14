import { describe, expect, it } from "vitest";
import { GroqAdapter, GROQ_ITINERARY_JSON_SCHEMA } from "../src/modules/jobs/groq-adapter.ts";

describe("GroqAdapter", () => {
  it("sends Groq chat completions with json_object and trip preferences", async () => {
    let url = "";
    let headers: HeadersInit | undefined;
    let body: Record<string, unknown> = {};
    const adapter = new GroqAdapter("test-key", "openai/gpt-oss-20b", async (requestUrl, init) => {
      url = String(requestUrl);
      headers = init?.headers;
      body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({ summary: null, assumptions: [], days: [], budgetItems: [] }),
              },
            },
          ],
        }),
        { status: 200 },
      );
    });

    await adapter.generate({ tripId: "trip-1", preferences: { city: "Yogyakarta" } });
    expect(url).toBe("https://api.groq.com/openai/v1/chat/completions");
    expect(headers).toMatchObject({ Authorization: "Bearer test-key" });
    expect(body.model).toBe("openai/gpt-oss-20b");
    const format = body.response_format as { type: string };
    expect(format.type).toBe("json_object");
    const messages = body.messages as Array<{ content: string }>;
    expect(messages[0]?.content).toContain("object");
    expect(messages.at(-1)?.content).toContain("Yogyakarta");
    expect(messages.at(-1)?.content).toContain("Jangan hitung total budget");
  });
});
