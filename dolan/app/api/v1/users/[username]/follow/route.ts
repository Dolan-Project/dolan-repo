import { communityRouteHandlers } from "@/lib/community/adapter";

type RouteContext = { params: Promise<{ username: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { username } = await context.params;
  return communityRouteHandlers.follow(request, username);
}

export async function DELETE(request: Request, context: RouteContext) {
  const { username } = await context.params;
  return communityRouteHandlers.unfollow(request, username);
}
