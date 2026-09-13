import { socialRouteHandlers } from "@/lib/social/adapter";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { id } = await context.params;
  return socialRouteHandlers.notifications.markRead(request, id);
}
