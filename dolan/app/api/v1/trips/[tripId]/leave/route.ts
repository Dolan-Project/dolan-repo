import { tripRouteHandlers } from "@/lib/auth/adapter";

type Ctx = { params: Promise<{ tripId: string }> };

export async function POST(request: Request, { params }: Ctx) {
  const { tripId } = await params;
  return tripRouteHandlers.leave(request, tripId);
}
