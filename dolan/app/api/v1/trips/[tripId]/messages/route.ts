import { socialRouteHandlers } from "@/lib/social/adapter";

type RouteContext = { params: Promise<{ tripId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { tripId } = await context.params;
  return socialRouteHandlers.messages.GET(request, tripId);
}

export async function POST(request: Request, context: RouteContext) {
  const { tripId } = await context.params;
  return socialRouteHandlers.messages.POST(request, tripId);
}
