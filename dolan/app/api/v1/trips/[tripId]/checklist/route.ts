<<<<<<< HEAD
import { proxyToExpress } from "@/lib/auth/express-proxy";
import { jsonResult } from "@/lib/auth/api-response";
import { shouldUseMockApi } from "@/lib/auth/use-mock";

export async function POST(request: Request, { params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    id?: string;
    title?: string;
    dueDate?: string | null;
    isCompleted?: boolean;
  };
  if (shouldUseMockApi()) {
    return jsonResult(
      {
        success: true,
        data: {
          id: body.id ?? `check-${crypto.randomUUID()}`,
          title: body.title ?? "Item",
          dueDate: body.dueDate ?? null,
          isCompleted: Boolean(body.isCompleted),
        },
      },
      body.id ? 200 : 201,
    );
  }
  return proxyToExpress(request, `/api/v1/trips/${encodeURIComponent(tripId)}/checklist`, {
    method: "POST",
    json: body,
  });
=======
import { AUTH_ERROR_CODES } from "@/lib/contracts";
import { jsonResult } from "@/lib/auth/api-response";
import { proxyToExpress } from "@/lib/auth/express-proxy";
import { shouldUseMockApi } from "@/lib/auth/use-mock";
import { upsertMockChecklistItem } from "@/features/itinerary/trip-itinerary-store";

export async function POST(request: Request, { params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  if (!shouldUseMockApi()) {
    return proxyToExpress(request, `/api/v1/trips/${encodeURIComponent(tripId)}/checklist`);
  }
  const body = (await request.json().catch(() => ({}))) as {
    id?: string;
    title?: string;
    isCompleted?: boolean;
    dueDate?: string | null;
  };
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
>>>>>>> 13c57bd (style: redesign edit page)
}
