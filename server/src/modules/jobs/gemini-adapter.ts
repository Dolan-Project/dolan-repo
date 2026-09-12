import { geminiItinerarySchema, type GeminiItinerary } from "@dolan/shared";

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
                googlePlaceId: "ChIJcb2MxKYb0i0RaHu5gKbM3eM",
                name: "Pantai Kuta",
                city: "Badung",
              },
              customTitle: null,
              activityType: "wisata",
              startTime: "09:00",
              durationMinutes: 120,
              travelDurationMinutes: 30,
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

export function parseGeminiItinerary(payload: unknown): GeminiItinerary {
  return geminiItinerarySchema.parse(payload);
}
