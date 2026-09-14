import { proxyToExpress } from "@/lib/auth/express-proxy";
import { shouldUseMockApi } from "@/lib/auth/use-mock";
import { jsonResult } from "@/lib/auth/api-response";

export async function GET(request: Request, { params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  if (shouldUseMockApi()) return jsonResult({ success: true, data: { points: [], polylines: [] } }, 200);
  return proxyToExpress(request, `/api/v1/trips/${encodeURIComponent(tripId)}/route`);
}
