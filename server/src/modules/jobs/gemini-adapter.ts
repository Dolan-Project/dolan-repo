import { geminiItinerarySchema, type GeminiItinerary } from "@dolan/shared";

export const GEMINI_ITINERARY_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    summary: { type: "STRING", nullable: true },
    assumptions: { type: "ARRAY", items: { type: "STRING" } },
    days: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          dayNumber: { type: "INTEGER" },
          date: { type: "STRING" },
          title: { type: "STRING", nullable: true },
          stops: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                sequence: { type: "INTEGER" },
                place: {
                  type: "OBJECT",
                  nullable: true,
                  properties: {
                    googlePlaceId: { type: "STRING" },
                    name: { type: "STRING" },
                    city: { type: "STRING", nullable: true },
                  },
                  required: ["googlePlaceId", "name", "city"],
                },
                customTitle: { type: "STRING", nullable: true },
                activityType: { type: "STRING" },
                startTime: { type: "STRING", nullable: true },
                durationMinutes: { type: "INTEGER" },
                travelDurationMinutes: { type: "INTEGER", nullable: true },
                notes: { type: "STRING", nullable: true },
                isLocked: { type: "BOOLEAN" },
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
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          category: { type: "STRING" },
          label: { type: "STRING" },
          quantity: { type: "STRING" },
          unit: { type: "STRING" },
          unitCostLow: { type: "STRING" },
          unitCostHigh: { type: "STRING" },
          sourceType: { type: "STRING" },
          sourceReference: { type: "STRING", nullable: true },
          notes: { type: "STRING", nullable: true },
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

export class MockGeminiAdapter implements GenerationModel {
  constructor(private readonly fixture?: unknown) {}

  async generate(): Promise<unknown> {
    if (this.fixture) return this.fixture;
    return {
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
  }
}

export class GeminiAdapter implements GenerationModel {
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async generate(input: { tripId: string; preferences?: Record<string, unknown> }): Promise<unknown> {
    const response = await this.fetchImpl(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `Buat itinerary JSON untuk trip ${input.tripId}. Hanya Google Place ID nyata (awalan ChIJ) yang bisa diverifikasi. Jangan hitung total budget. Preferences trip: ${JSON.stringify(input.preferences ?? {})}`,
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: GEMINI_ITINERARY_RESPONSE_SCHEMA,
          },
        }),
      },
    );
    if (!response.ok) {
      throw new Error("PROVIDER_UNAVAILABLE");
    }
    const payload = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("PROVIDER_UNAVAILABLE");
    return JSON.parse(text) as unknown;
  }
}

export function parseGeminiItinerary(payload: unknown): GeminiItinerary {
  return geminiItinerarySchema.parse(payload);
}
