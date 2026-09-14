import { proxyToExpress } from "@/lib/auth/express-proxy";
import { jsonResult } from "@/lib/auth/api-response";
import { shouldUseMockApi } from "@/lib/auth/use-mock";
import { getMockItinerarySnapshot } from "@/features/itinerary/trip-itinerary-store";

export async function GET(request: Request, { params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  if (shouldUseMockApi()) return jsonResult({ success: true, data: getMockItinerarySnapshot(tripId) }, 200);
  return proxyToExpress(request, `/api/v1/trips/${encodeURIComponent(tripId)}/itinerary`);
}
