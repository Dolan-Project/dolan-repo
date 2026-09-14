import { communityRouteHandlers } from "@/lib/community/adapter";

type RouteContext = { params: Promise<{ tripId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { tripId } = await context.params;
  return communityRouteHandlers.attendance(request, tripId);
}
