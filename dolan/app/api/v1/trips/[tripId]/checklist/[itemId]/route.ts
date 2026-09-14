import { proxyToExpress } from "@/lib/auth/express-proxy";
import { jsonResult } from "@/lib/auth/api-response";
import { shouldUseMockApi } from "@/lib/auth/use-mock";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ tripId: string; itemId: string }> },
) {
  const { tripId, itemId } = await params;
  if (shouldUseMockApi()) {
    return jsonResult({ success: true, data: { deleted: true, id: itemId } }, 200);
  }
  return proxyToExpress(
    request,
    `/api/v1/trips/${encodeURIComponent(tripId)}/checklist/${encodeURIComponent(itemId)}`,
    { method: "DELETE" },
  );
}
