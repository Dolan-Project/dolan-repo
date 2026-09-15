import { socialRouteHandlers } from "@/lib/social/adapter";
import { proxyToExpress } from "@/lib/auth/express-proxy";
import { shouldUseMockApi } from "@/lib/auth/use-mock";
import { jsonResult } from "@/lib/auth/api-response";
import { createApiError } from "@/mocks/scenarios";

type RouteContext = { params: Promise<{ tripId: string; commentId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const { tripId, commentId } = await context.params;
  if (!shouldUseMockApi()) {
    return proxyToExpress(
      request,
      `/api/v1/trips/${encodeURIComponent(tripId)}/comments/${encodeURIComponent(commentId)}`,
    );
  }
  return jsonResult(createApiError("NOT_IMPLEMENTED", "Edit komentar hanya tersedia di mode live"), 501);
}

export async function DELETE(request: Request, context: RouteContext) {
  const { tripId, commentId } = await context.params;
  if (!shouldUseMockApi()) {
    return proxyToExpress(
      request,
      `/api/v1/trips/${encodeURIComponent(tripId)}/comments/${encodeURIComponent(commentId)}`,
      { method: "DELETE" },
    );
  }
  return jsonResult(createApiError("NOT_IMPLEMENTED", "Hapus komentar hanya tersedia di mode live"), 501);
}
