import { communityRouteHandlers } from "@/lib/community/adapter";

type RouteContext = { params: Promise<{ reportId: string }> };

export async function POST(request: Request, context: RouteContext) {
  const { reportId } = await context.params;
  return communityRouteHandlers.moderate(request, reportId);
}
