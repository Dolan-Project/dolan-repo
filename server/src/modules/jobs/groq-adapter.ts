import { geminiItinerarySchema, type GeminiItinerary } from "@dolan/shared";
import { logger } from "../../lib/logger.ts";

export const GROQ_ITINERARY_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: ["string", "null"] },
    assumptions: { type: "array", items: { type: "string" } },
    days: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          dayNumber: { type: "integer" },
          date: { type: "string" },
          title: { type: ["string", "null"] },
          stops: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                sequence: { type: "integer" },
                place: {
                  type: ["object", "null"],
                  additionalProperties: false,
                  properties: {
                    googlePlaceId: { type: "string" },
                    name: { type: "string" },
                    city: { type: ["string", "null"] },
                  },
                  required: ["googlePlaceId", "name", "city"],
                },
                customTitle: { type: ["string", "null"] },
                activityType: { type: "string" },
                startTime: { type: ["string", "null"] },
                durationMinutes: { type: "integer" },
                travelDurationMinutes: { type: ["integer", "null"] },
                notes: { type: ["string", "null"] },
                isLocked: { type: "boolean" },
              },
              required: [
                "sequence",
                "place",
                "customTitle",
                "activityType",
                "startTime",
                "durationMinutes",
                "travelDurationMinutes",
                "notes",
                "isLocked",
              ],
            },
          },
        },
        required: ["dayNumber", "date", "title", "stops"],
      },
    },
    budgetItems: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          category: { type: "string" },
          label: { type: "string" },
          quantity: { type: "string" },
          unit: { type: "string" },
          unitCostLow: { type: "string" },
          unitCostHigh: { type: "string" },
          sourceType: { type: "string" },
          sourceReference: { type: ["string", "null"] },
          notes: { type: ["string", "null"] },
        },
        required: ["category", "label", "quantity", "unit", "unitCostLow", "unitCostHigh", "sourceType"],
      },
    },
  },
  required: ["summary", "assumptions", "days", "budgetItems"],
};

export interface GenerationModel {
  generate(input: { tripId: string; preferences?: Record<string, unknown> }): Promise<unknown>;
}

const MOCK_ITINERARY = {
  summary: "Mock itinerary for development",
  assumptions: ["Estimasi, bukan harga booking"],
  days: [
    {
      dayNumber: 1,
      date: "2026-10-01",
      title: "Hari 1",
      stops: [
        {
          sequence: 1,
          place: {
            googlePlaceId: "ChIJxYBx6Da5eY4R2lX2sQ0oYkA",
            name: "Malioboro",
            city: "Yogyakarta",
          },
          customTitle: null,
          activityType: "wisata",
          startTime: "09:00",
          durationMinutes: 120,
          travelDurationMinutes: null,
          notes: null,
          isLocked: false,
        },
        {
          sequence: 2,
          place: {
            googlePlaceId: "ChIJf5UqGYeXeY4RwZVQ9n0s7oE",
            name: "Candi Prambanan",
            city: "Yogyakarta",
          },
          customTitle: null,
          activityType: "wisata",
          startTime: "13:00",
          durationMinutes: 150,
          travelDurationMinutes: null,
          notes: null,
          isLocked: false,
        },
      ],
    },
  ],
  budgetItems: [
    {
      category: "aktivitas",
      label: "Tiket pantai",
      quantity: "1.00",
      unit: "orang",
      unitCostLow: "25000.00",
      unitCostHigh: "50000.00",
      sourceType: "estimate",
    },
  ],
} satisfies GeminiItinerary;

export class MockGroqAdapter implements GenerationModel {
  constructor(private readonly fixture?: unknown) {}

  async generate(): Promise<unknown> {
    return this.fixture ?? MOCK_ITINERARY;
  }
}

export class GroqAdapter implements GenerationModel {
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async generate(input: { tripId: string; preferences?: Record<string, unknown> }): Promise<unknown> {
    const prompt = `Buat itinerary JSON untuk trip ${input.tripId}. Hanya Google Place ID nyata (awalan ChIJ) yang bisa diverifikasi. Jangan hitung total budget. Preferences trip: ${JSON.stringify(input.preferences ?? {})}`;
    const response = await this.fetchImpl("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: `You are a travel itinerary generator. Reply with a single JSON object matching this schema (no markdown): ${JSON.stringify(GROQ_ITINERARY_JSON_SCHEMA)}`,
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });
    const payload = (await response.json()) as {
      error?: { message?: string; code?: string };
      choices?: Array<{ message?: { content?: string | null } }>;
    };
    if (!response.ok) {
      logger.error("Groq generate failed", {
        status: response.status,
        groqCode: payload.error?.code ?? null,
        groqMessage: payload.error?.message ?? null,
      });
      throw new Error("PROVIDER_UNAVAILABLE");
    }
    const text = payload.choices?.[0]?.message?.content;
    if (!text) {
      logger.error("Groq generate returned empty content", { status: response.status });
      throw new Error("PROVIDER_UNAVAILABLE");
    }
    return JSON.parse(stripFence(text)) as unknown;
  }
}

function stripFence(text: string) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced?.[1] ?? trimmed;
}

export function parseGeneratedItinerary(payload: unknown): GeminiItinerary {
  return geminiItinerarySchema.parse(payload);
}

/** @deprecated Use parseGeneratedItinerary */
export const parseGeminiItinerary = parseGeneratedItinerary;
export const MockGeminiAdapter = MockGroqAdapter;
export const GeminiAdapter = GroqAdapter;
