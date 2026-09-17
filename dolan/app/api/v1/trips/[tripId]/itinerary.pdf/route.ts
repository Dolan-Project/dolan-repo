import { proxyToExpress } from "@/lib/auth/express-proxy";
import { shouldUseMockApi } from "@/lib/auth/use-mock";
import { getMockItinerarySnapshot } from "@/features/itinerary/trip-itinerary-store";
import { itineraryPdfResponse } from "@/lib/itinerary-pdf";
import type { ItineraryEditorSnapshot } from "@dolan/shared";

type Ctx = { params: Promise<{ tripId: string }> };

function linesFromSnapshot(snapshot: ItineraryEditorSnapshot) {
  const version = snapshot.versions.find((item) => item.id === snapshot.activeVersionId) ?? snapshot.versions[0];
  const food = version?.budget.items.filter((item) => item.category === "FOOD") ?? [];
  const foodTotal = food.reduce((sum, item) => sum + Number(item.unitCostHigh || item.unitCostLow || 0), 0);
  return [
    snapshot.destinationCity,
    `${snapshot.startDate} - ${snapshot.endDate}`,
    version?.summary ?? "",
    foodTotal > 0 ? `Budget makanan: Rp ${Math.round(foodTotal).toLocaleString("id-ID")}` : "",
    version?.budget.totalHigh ? `Total estimasi: Rp ${Number(version.budget.totalHigh).toLocaleString("id-ID")}` : "",
    ...(version?.days ?? []).flatMap((day) => [
      `Hari ${day.dayNumber}${day.date ? ` - ${day.date}` : ""}${day.title ? ` - ${day.title}` : ""}`,
      ...day.stops.map((stop, index) => {
        const name = stop.customTitle || stop.place?.name || `Titik ${index + 1}`;
        const time = stop.startTime ? ` ${String(stop.startTime).slice(0, 5)}` : "";
        const distance = stop.travelDistanceMeters != null ? ` ${(stop.travelDistanceMeters / 1000).toFixed(1)} km` : "";
        const duration = stop.travelDurationMinutes ? ` ${stop.travelDurationMinutes} menit` : "";
        const unavailable = stop.routeStatus === "UNAVAILABLE" ? " Rute jalan tidak tersedia" : `${distance}${duration}`;
        const notes = stop.notes ? ` ${stop.notes}` : "";
        return `  ${index + 1}.${time} ${name}${unavailable}${notes}`;
      }),
    ]),
    ...(snapshot.checklist.length
      ? ["Checklist:", ...snapshot.checklist.map((item) => `  - [${item.isCompleted ? "x" : " "}] ${item.title}`)]
      : []),
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
