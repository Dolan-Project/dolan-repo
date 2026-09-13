import { communityRouteHandlers } from "@/lib/community/adapter";

type RouteContext = { params: Promise<{ username: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { username } = await context.params;
  return communityRouteHandlers.history(request, username);
}
