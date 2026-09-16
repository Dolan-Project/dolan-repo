import { proxyToExpress } from "@/lib/auth/express-proxy";
import { handleCreateTripRequest } from "@/lib/auth/handle-trip";
import { jsonResult } from "@/lib/auth/api-response";
import { shouldUseMockApi } from "@/lib/auth/use-mock";

export async function POST(
  request: Request,
  context: { params: Promise<{ templateId: string }> },
) {
  const { templateId } = await context.params;
  if (shouldUseMockApi()) {
    const body = await request.json() as {
      templateTitle?: string;
      destinationCity?: string;
      originLabel?: string;
      startDate?: string;
      endDate?: string;
      transportMode?: string;
      planningPartySize?: number;
      budgetAmount?: string;
      budgetBasis?: "PER_PERSON" | "GROUP";
    };
    const mockRequest = new Request(request.url, {
      method: "POST",
      headers: request.headers,
      body: JSON.stringify({
        path: "known",
        title: body.templateTitle || "Trip dari template Dolan",
        description: "Draft dibuat dari template itinerary dan siap diedit.",
        origin: body.originLabel || "Titik awal belum ditentukan",
        destinationCity: body.destinationCity || "Yogyakarta",
        startDate: body.startDate,
        endDate: body.endDate || body.startDate,
        transport: body.transportMode || "Transportasi umum",
        planningPartySize: body.planningPartySize || 1,
        budgetAmount: Number(body.budgetAmount || 1),
        budgetBasis: body.budgetBasis || "PER_PERSON",
        lodgingPref: "",
        activityPrefs: [],
        visibility: "PRIVATE",
        companionNote: "",
      }),
    });
    const response = await handleCreateTripRequest(mockRequest);
    const payload = await response.json() as { success: boolean; data?: { id: string }; error?: unknown };
    if (!payload.success || !payload.data) {
      return new Response(JSON.stringify(payload), {
        status: response.status,
        headers: { "content-type": "application/json" },
      });
    }
    return jsonResult({ success: true, data: { tripId: payload.data.id, itineraryVersionId: `template-${templateId}`, trip: payload.data } }, 201);
  }
  return proxyToExpress(
    request,
    `/api/v1/templates/${encodeURIComponent(templateId)}/use`,
  );
}
