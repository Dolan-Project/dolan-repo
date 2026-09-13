import { socialRouteHandlers } from "@/lib/social/adapter";

type RouteContext = { params: Promise<{ requestId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { requestId } = await context.params;
  return socialRouteHandlers.review(request, requestId);
}
