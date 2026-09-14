import { proxyToExpress } from "@/lib/auth/express-proxy";

type Ctx = { params: Promise<{ tripId: string }> };

export async function POST(request: Request, { params }: Ctx) {
  const { tripId } = await params;
  return proxyToExpress(request, `/api/v1/trips/${encodeURIComponent(tripId)}/share-links`);
}
