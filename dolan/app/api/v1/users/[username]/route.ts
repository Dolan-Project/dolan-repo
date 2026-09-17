import { profileRouteHandlers } from "@/lib/auth/adapter";

type RouteContext = {
  params: Promise<{ username: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { username } = await context.params;
  return profileRouteHandlers.byUsername(request, username);
}
