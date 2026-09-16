import type { EditableItineraryDay } from "@dolan/shared";
import { proxyToExpress } from "@/lib/auth/express-proxy";
import { jsonResult } from "@/lib/auth/api-response";
import { shouldUseMockApi } from "@/lib/auth/use-mock";
import { saveMockItinerarySnapshot } from "@/features/itinerary/trip-itinerary-store";

export async function POST(request: Request, { params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  if (shouldUseMockApi()) {
    const body = await request.json().catch(() => ({})) as { days?: EditableItineraryDay[]; summary?: string | null };
    return jsonResult({ success: true, data: saveMockItinerarySnapshot(tripId, body.days ?? [], body.summary) }, 201);
  }
  return proxyToExpress(request, `/api/v1/trips/${encodeURIComponent(tripId)}/itinerary-versions`);
}
