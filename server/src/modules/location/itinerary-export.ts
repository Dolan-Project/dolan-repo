import { HttpError } from "../../lib/api-error.ts";
import type { ChatService } from "../chat/chat-service.ts";
import { renderItineraryPdf } from "./itinerary-pdf.ts";
import { googleMapsDirUrl, type NavStop } from "./maps-url.ts";

export type ExportItinerary = {
  tripId: string;
  versionId: string;
  title: string;
  summary: string | null;
  budgetLine?: string | null;
  checklistLines?: string[];
  days: Array<{ dayNumber: number; date?: string | null; title: string | null; stops: NavStop[] }>;
};

function formatMeters(meters: number | null | undefined) {
  if (meters == null || !Number.isFinite(meters) || meters < 0) return null;
  return `${(meters / 1000).toFixed(meters >= 10000 ? 0 : 1)} km`;
}

export function formatExportStopLine(stop: NavStop, index: number) {
  const bits = [`${index + 1}.`];
  if (stop.startTime) bits.push(String(stop.startTime).slice(0, 5));
  bits.push(stop.name);
  if (stop.routeStatus === "UNAVAILABLE") {
    bits.push("Rute jalan tidak tersedia");
  } else {
    const km = formatMeters(stop.travelDistanceMeters);
    if (km) bits.push(km);
    if (stop.travelDurationMinutes) bits.push(`${stop.travelDurationMinutes} menit`);
  }
  if (stop.meal) bits.push(stop.meal);
  if (stop.notes) bits.push(stop.notes);
  return `  ${bits.join(" ")}`;
}

export class ItineraryExportService {
  constructor(
    private readonly chat: ChatService,
    private readonly load: (tripId: string, versionId?: string) => Promise<ExportItinerary | null>,
  ) {}

  async requireDoc(tripId: string, userId: string, versionId?: string) {
    this.chat.assertCanRead(await this.chat.accessFor(tripId, userId));
    const doc = await this.load(tripId, versionId);
    if (!doc) {
      throw new HttpError(404, "NOT_FOUND", "Selected itinerary version was not found");
    }
    return doc;
  }

  async pdf(tripId: string, userId: string, versionId?: string) {
    const doc = await this.requireDoc(tripId, userId, versionId);
    const lines = [
      doc.summary ?? "",
      doc.budgetLine ?? "",
      ...doc.days.flatMap((day) => [
        `Hari ${day.dayNumber}${day.date ? ` - ${day.date}` : ""}${day.title ? ` - ${day.title}` : ""}`,
        ...day.stops.map((stop, index) => formatExportStopLine(stop, index)),
      ]),
      ...(doc.checklistLines?.length ? ["Checklist:", ...doc.checklistLines.map((item) => `  - ${item}`)] : []),
    ].filter(Boolean);
    return renderItineraryPdf(doc.title, lines);
  }

  async navigation(tripId: string, userId: string, dayNumber?: number, versionId?: string) {
    const doc = await this.requireDoc(tripId, userId, versionId);
    const day = dayNumber ? doc.days.find((item) => item.dayNumber === dayNumber) : doc.days[0];
    const url = googleMapsDirUrl(day?.stops ?? []);
    if (!url) {
      throw new HttpError(404, "NOT_FOUND", "No stops available for navigation");
    }
    return { versionId: doc.versionId, dayNumber: day?.dayNumber ?? null, url };
  }
}
