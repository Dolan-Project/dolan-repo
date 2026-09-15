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

export const GROQ_DESTINATION_RECOMMENDATIONS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    candidates: {
      type: "array",
      minItems: 1,
      maxItems: 8,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          googlePlaceId: { type: "string" },
          name: { type: "string" },
          city: { type: "string" },
          region: nullableString,
          estimateNote: nullableString,
          estimatedBudgetLow: nullableString,
          estimatedBudgetHigh: nullableString,
        },
        required: [
          "googlePlaceId",
          "name",
          "city",
          "region",
          "estimateNote",
          "estimatedBudgetLow",
          "estimatedBudgetHigh",
        ],
      },
    },
  },
  required: ["candidates"],
} as const;

export class GroqAdapter implements GenerationModel {
  private readonly client: Groq;
  constructor(apiKey: string, private readonly model: string) { this.client = new Groq({ apiKey }); }
  async generate(input: { tripId: string; preferences?: Record<string, unknown> }): Promise<unknown> {
    if (input.preferences?.recommendDestinations) {
      return this.recommend(input);
    }
    const mode = String(input.preferences?.regenerateMode ?? "balanced");
    const style =
      mode === "cheaper"
        ? "Prioritaskan rute hemat backpacker: transportasi umum, makan kaki lima, atraksi murah/gratis, jarak tempuh pendek, dan estimasi budget di kisaran rendah."
        : mode === "alternative"
          ? "Buat rute alternatif yang berbeda urutan/tempatnya dari rencana umum, tetap realistis untuk backpacker, dan hindari pengulangan destinasi yang terlalu klise jika ada opsi setara."
          : "Buat rute seimbang antara waktu, biaya, dan pengalaman populer.";
    const minStops = Number(input.preferences?.minStopsPerDay ?? 2);
    const maxStops = Number(input.preferences?.maxStopsPerDay ?? 4);
    const response = await this.client.chat.completions.create({
      model: this.model,
      temperature: mode === "alternative" ? 0.5 : 0.2,
      max_completion_tokens: 8192,
      messages: [
        {
          role: "system",
          content: `Kamu adalah perencana perjalanan backpacker Indonesia. ${style} Kembalikan JSON sesuai schema. Budget merupakan estimasi, bukan harga paket. Kategori budget hanya: TRANSPORT_ROUNDTRIP, TRANSPORT_LOCAL, LODGING, FOOD, ACTIVITIES, OTHER, RESERVE.
Penting untuk place: isi name + city dengan nama tempat wisata nyata yang akurat (bahasa lokal/umum). Field googlePlaceId boleh placeholder berawalan ChIJ; server akan resolve ID resmi via Google Places dari nama. Jangan mengarang ID yang tidak kamu pastikan.
Aturan rute wajib: buat tepat satu day card per hari perjalanan (dayNumber berurutan). DILARANG 1 destinasi per hari — wisatawan tidak menghabiskan seharian di satu tempat. Tiap hari WAJIB ${minStops}-${maxStops} tempat populer yang berdekatan (jalan kaki/ojek, koridor yang sama). Kalau landmark besar (Danau Toba, Bukit Lawang), tambahkan 2-3 tempat di kawasan itu (desa, museum, pasar, air terjun terdekat), jangan pindah ke kota jauh. Semua place WAJIB di/dekat destinasi trip di preferences.destinationCity. DILARANG pindah pulau: Bali tidak boleh Labuan Bajo/Padar/Pink Beach/Komodo/NTT; Cirebon tidak boleh kosong atau jadi Bandung. Untuk Cirebon pakai Keraton Kasepuhan, Goa Sunyaragi, Batik Trusmi. Urutkan nearest-neighbor. travelDurationMinutes 0 hanya untuk stop pertama tiap hari. Sertakan estimasi TRANSPORT_LOCAL / ACTIVITIES / FOOD per kunjungan.`,
        },
        { role: "user", content: `Susun itinerary optimal untuk trip ${input.tripId}. Preferensi: ${JSON.stringify(input.preferences ?? {})}` },
      ],
      response_format: { type: "json_schema", json_schema: { name: "dolan_itinerary", strict: true, schema: GROQ_ITINERARY_RESPONSE_SCHEMA } },
    });
    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("PROVIDER_UNAVAILABLE");
    return JSON.parse(content);
  }

  async recommend(input: { tripId: string; preferences?: Record<string, unknown> }): Promise<unknown> {
    const response = await this.client.chat.completions.create({
      model: this.model,
      temperature: 0.3,
      max_completion_tokens: 4096,
      messages: [
        {
          role: "system",
          content:
            "Kamu merekomendasikan destinasi backpacker di Indonesia. Kembalikan JSON sesuai schema. Prioritaskan name + city akurat; googlePlaceId boleh placeholder ChIJ karena server resolve via Google Places. Sertakan 3–5 destinasi berbeda dengan estimasi budget IDR sebagai string desimal.",
        },
        {
          role: "user",
          content: `Rekomendasikan destinasi untuk trip ${input.tripId}. Preferensi: ${JSON.stringify(input.preferences ?? {})}`,
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "dolan_destination_recommendations",
          strict: true,
          schema: GROQ_DESTINATION_RECOMMENDATIONS_SCHEMA,
        },
      },
    });
    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("PROVIDER_UNAVAILABLE");
    return JSON.parse(content);
  }
}

export function parseGroqItinerary(payload: unknown): GeminiItinerary { return geminiItinerarySchema.parse(payload); }
