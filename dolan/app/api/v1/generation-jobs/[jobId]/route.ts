import { proxyToExpress } from "@/lib/auth/express-proxy";
import { jsonResult } from "@/lib/auth/api-response";
import { shouldUseMockApi } from "@/lib/auth/use-mock";

export async function GET(request: Request, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  if (shouldUseMockApi()) {
    return jsonResult({
      success: true,
      data: {
        id: jobId,
        tripId: "00000000-0000-4000-8000-000000000001",
        requestedBy: "00000000-0000-4000-8000-000000000002",
        type: "GENERATE_ITINERARY",
        status: "SUCCEEDED",
        attemptCount: 1,
        resultVersionId: "00000000-0000-4000-8000-000000000003",
        selectedVersionId: null,
        errorCode: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    }, 200);
  }
  return proxyToExpress(request, `/api/v1/generation-jobs/${encodeURIComponent(jobId)}`);
}
