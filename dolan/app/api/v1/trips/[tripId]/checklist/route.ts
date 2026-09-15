import { AUTH_ERROR_CODES } from "@/lib/contracts";
import { jsonResult } from "@/lib/auth/api-response";
import { proxyToExpress } from "@/lib/auth/express-proxy";
import { shouldUseMockApi } from "@/lib/auth/use-mock";
import { upsertMockChecklistItem } from "@/features/itinerary/trip-itinerary-store";

export async function POST(request: Request, { params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    id?: string;
    title?: string;
    dueDate?: string | null;
    isCompleted?: boolean;
  };
  if (!shouldUseMockApi()) {
    return proxyToExpress(request, `/api/v1/trips/${encodeURIComponent(tripId)}/checklist`, {
      method: "POST",
      json: body,
    });
  }
  const title = body.title?.trim();
  if (!title) {
    return jsonResult({
      success: false,
      error: { code: AUTH_ERROR_CODES.VALIDATION_ERROR, message: "Nama perlengkapan wajib diisi", requestId: "req_mock" },
    }, 400);
  }
  const item = upsertMockChecklistItem(tripId, {
    id: body.id,
    title,
    isCompleted: body.isCompleted,
    dueDate: body.dueDate,
  });
  return jsonResult({ success: true, data: item }, body.id ? 200 : 201);
}
