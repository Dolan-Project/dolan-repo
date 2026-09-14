import Groq from "groq-sdk";
import { geminiItinerarySchema, type GeminiItinerary } from "@dolan/shared";
import type { GenerationModel } from "./gemini-adapter.ts";

const nullableString = { type: ["string", "null"] } as const;

export const GROQ_ITINERARY_RESPONSE_SCHEMA = {
  type: "object", additionalProperties: false,
  properties: {
    summary: nullableString,
    assumptions: { type: "array", items: { type: "string" } },
    days: { type: "array", minItems: 1, items: { type: "object", additionalProperties: false, properties: {
      dayNumber: { type: "integer" }, date: { type: "string" }, title: nullableString,
      stops: { type: "array", minItems: 1, items: { type: "object", additionalProperties: false, properties: {
        sequence: { type: "integer" }, place: { anyOf: [{ type: "null" }, { type: "object", additionalProperties: false, properties: { googlePlaceId: { type: "string" }, name: { type: "string" }, city: nullableString }, required: ["googlePlaceId", "name", "city"] }] },
        customTitle: nullableString, activityType: { type: "string" }, startTime: nullableString,
        durationMinutes: { type: "integer" }, travelDurationMinutes: { type: ["integer", "null"] }, notes: nullableString, isLocked: { type: "boolean" },
      }, required: ["sequence", "place", "customTitle", "activityType", "startTime", "durationMinutes", "travelDurationMinutes", "notes", "isLocked"] } },
    }, required: ["dayNumber", "date", "title", "stops"] } },
    budgetItems: { type: "array", items: { type: "object", additionalProperties: false, properties: {
      category: { type: "string" }, label: { type: "string" }, quantity: { type: "string" }, unit: { type: "string" }, unitCostLow: { type: "string" }, unitCostHigh: { type: "string" }, sourceType: { type: "string" }, sourceReference: nullableString, notes: nullableString,
    }, required: ["category", "label", "quantity", "unit", "unitCostLow", "unitCostHigh", "sourceType", "sourceReference", "notes"] } },
  }, required: ["summary", "assumptions", "days", "budgetItems"],
} as const;

export class GroqAdapter implements GenerationModel {
  private readonly client: Groq;
  constructor(apiKey: string, private readonly model: string) { this.client = new Groq({ apiKey }); }
  async generate(input: { tripId: string; preferences?: Record<string, unknown> }): Promise<unknown> {
    const mode = String(input.preferences?.regenerateMode ?? "balanced");
    const style =
      mode === "cheaper"
        ? "Prioritaskan rute hemat backpacker: transportasi umum, makan kaki lima, atraksi murah/gratis, jarak tempuh pendek, dan estimasi budget di kisaran rendah."
        : mode === "alternative"
          ? "Buat rute alternatif yang berbeda urutan/tempatnya dari rencana umum, tetap realistis untuk backpacker, dan hindari pengulangan destinasi yang terlalu klise jika ada opsi setara."
          : "Buat rute seimbang antara waktu, biaya, dan pengalaman populer.";
    const response = await this.client.chat.completions.create({
      model: this.model, temperature: mode === "alternative" ? 0.5 : 0.2,
      messages: [
        { role: "system", content: `Kamu adalah perencana perjalanan backpacker Indonesia. ${style} Kembalikan JSON sesuai schema. Budget merupakan estimasi, bukan harga paket. Gunakan tempat nyata yang selanjutnya diverifikasi server.` },
        { role: "user", content: `Susun itinerary optimal untuk trip ${input.tripId}. Preferensi: ${JSON.stringify(input.preferences ?? {})}` },
      ],
      response_format: { type: "json_schema", json_schema: { name: "dolan_itinerary", strict: true, schema: GROQ_ITINERARY_RESPONSE_SCHEMA } },
    });
    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("PROVIDER_UNAVAILABLE");
    return JSON.parse(content);
  }
}

export function parseGroqItinerary(payload: unknown): GeminiItinerary { return geminiItinerarySchema.parse(payload); }
