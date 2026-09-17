import { communityRouteHandlers } from "@/lib/community/adapter";

type RouteContext = { params: Promise<{ username: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { username } = await context.params;
  return communityRouteHandlers.reviews.GET(request, username);
}

export async function POST(request: Request, context: RouteContext) {
  const { username } = await context.params;
  return communityRouteHandlers.reviews.POST(request, username);
}
