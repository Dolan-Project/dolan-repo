import { proxyToExpress } from "@/lib/auth/express-proxy";
import { shouldUseMockApi } from "@/lib/auth/use-mock";
import { jsonResult } from "@/lib/auth/api-response";

export async function POST(request: Request, { params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  if (shouldUseMockApi()) return jsonResult({ success: true, data: { id: crypto.randomUUID(), tripId, status: "QUEUED", attemptCount: 0, resultVersionId: null, selectedVersionId: null, errorCode: null, type: "GENERATE_ITINERARY", requestedBy: crypto.randomUUID(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } }, 202);
  return proxyToExpress(request, `/api/v1/trips/${encodeURIComponent(tripId)}/generate`);
}
