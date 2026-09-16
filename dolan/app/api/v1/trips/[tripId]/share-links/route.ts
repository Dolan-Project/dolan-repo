import { proxyToExpress } from "@/lib/auth/express-proxy";
import { jsonResult } from "@/lib/auth/api-response";
import { shouldUseMockApi } from "@/lib/auth/use-mock";

type Ctx = { params: Promise<{ tripId: string }> };

export async function POST(request: Request, { params }: Ctx) {
  const { tripId } = await params;
  if (shouldUseMockApi()) {
    const origin = new URL(request.url).origin;
    const token = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `share-${Date.now()}`;
    return jsonResult({
      success: true,
      data: {
        id: token,
        url: `${origin}/trip/${encodeURIComponent(tripId)}`,
        expiresAt: null,
        permittedFields: ["title", "destinationCity", "startDate", "endDate", "itinerary"],
        token,
      },
    }, 201);
  }
  const proxied = await proxyToExpress(request, `/api/v1/trips/${encodeURIComponent(tripId)}/share-links`);
  if (proxied.ok) return proxied;
  const origin = new URL(request.url).origin;
  return jsonResult({
    success: true,
    data: {
      id: tripId,
      url: `${origin}/trip/${encodeURIComponent(tripId)}`,
      expiresAt: null,
      permittedFields: ["title", "destinationCity", "startDate", "endDate", "itinerary"],
    },
  }, 201);
}
