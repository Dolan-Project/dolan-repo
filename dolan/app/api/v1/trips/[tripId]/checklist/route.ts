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
}
