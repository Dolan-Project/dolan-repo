import { socialRouteHandlers } from "@/lib/social/adapter";

type RouteContext = { params: Promise<{ tripId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { tripId } = await context.params;
  return socialRouteHandlers.trip.GET(request, tripId);
}
