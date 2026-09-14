import { proxyToExpress } from "@/lib/auth/express-proxy";
import { jsonResult } from "@/lib/auth/api-response";
import { shouldUseMockApi } from "@/lib/auth/use-mock";
import { createEditorSnapshot } from "@/features/itinerary/mock-data";

export async function PATCH(request: Request, { params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  if (shouldUseMockApi()) {
    await request.json().catch(() => ({}));
    return jsonResult({ success: true, data: createEditorSnapshot(tripId) }, 200);
  }
  return proxyToExpress(request, `/api/v1/trips/${encodeURIComponent(tripId)}/current-itinerary-version`);
}
