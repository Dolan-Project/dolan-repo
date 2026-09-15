import { proxyToExpress } from "@/lib/auth/express-proxy";
import { shouldUseMockApi } from "@/lib/auth/use-mock";
import { getMockItinerarySnapshot } from "@/features/itinerary/trip-itinerary-store";
import { itineraryPdfResponse } from "@/lib/itinerary-pdf";
import type { ItineraryEditorSnapshot } from "@dolan/shared";

type Ctx = { params: Promise<{ tripId: string }> };

function linesFromSnapshot(snapshot: ItineraryEditorSnapshot) {
  const version = snapshot.versions.find((item) => item.id === snapshot.activeVersionId) ?? snapshot.versions[0];
  return [
    snapshot.destinationCity,
    `${snapshot.startDate} - ${snapshot.endDate}`,
    version?.summary ?? "",
    ...(version?.days ?? []).flatMap((day) => [
      `Hari ${day.dayNumber}${day.title ? ` - ${day.title}` : ""}`,
      ...day.stops.map((stop, index) => {
        const name = stop.customTitle || stop.place?.name || `Titik ${index + 1}`;
        const time = stop.startTime ? ` ${stop.startTime}` : "";
        return `  ${index + 1}.${time} ${name}`;
      }),
    ]),
  ].filter(Boolean);
}

export async function GET(request: Request, { params }: Ctx) {
  const { tripId } = await params;
  if (shouldUseMockApi()) {
    const snapshot = getMockItinerarySnapshot(tripId);
    return itineraryPdfResponse(snapshot.tripTitle, linesFromSnapshot(snapshot));
  }

  const proxied = await proxyToExpress(request, `/api/v1/trips/${encodeURIComponent(tripId)}/itinerary.pdf`);
  const contentType = proxied.headers.get("content-type") ?? "";
  if (proxied.ok && contentType.includes("pdf")) return proxied;

  const itinerary = await proxyToExpress(request, `/api/v1/trips/${encodeURIComponent(tripId)}/itinerary`);
  if (!itinerary.ok) return proxied;
  const payload = (await itinerary.json()) as { success?: boolean; data?: ItineraryEditorSnapshot };
  if (!payload.success || !payload.data) return proxied;
  return itineraryPdfResponse(payload.data.tripTitle, linesFromSnapshot(payload.data));
}
