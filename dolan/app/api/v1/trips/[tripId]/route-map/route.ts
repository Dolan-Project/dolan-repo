import { proxyToExpress } from "@/lib/auth/express-proxy";
import { shouldUseMockApi } from "@/lib/auth/use-mock";
import { jsonResult } from "@/lib/auth/api-response";
import { getMockItinerarySnapshot } from "@/features/itinerary/trip-itinerary-store";
import { itineraryMapMarkers } from "@/lib/template-itinerary";

export async function GET(request: Request, { params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  if (shouldUseMockApi()) {
    const snapshot = getMockItinerarySnapshot(tripId);
    const days = snapshot.versions.find((version) => version.id === snapshot.activeVersionId)?.days ?? snapshot.versions[0]?.days ?? [];
    const markers = itineraryMapMarkers(days, null);
    return jsonResult({
      success: true,
      data: {
        points: markers.map((marker) => ({ id: marker.id, label: marker.label, lat: marker.latitude, lng: marker.longitude })),
        polylines: [],
      },
    }, 200);
  }
  return proxyToExpress(request, `/api/v1/trips/${encodeURIComponent(tripId)}/route`);
}
