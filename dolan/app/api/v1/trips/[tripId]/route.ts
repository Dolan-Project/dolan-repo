import { tripRouteHandlers } from "@/lib/auth/adapter";

type Ctx = { params: Promise<{ tripId: string }> };

export async function GET(request: Request, { params }: Ctx) {
  const { tripId } = await params;
  return tripRouteHandlers.get(request, tripId);
}

export async function PATCH(request: Request, { params }: Ctx) {
  const { tripId } = await params;
  return tripRouteHandlers.update(request, tripId);
}
