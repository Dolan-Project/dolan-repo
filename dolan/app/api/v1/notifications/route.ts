import { socialRouteHandlers } from "@/lib/social/adapter";

export async function GET(request: Request) {
  return socialRouteHandlers.notifications.GET(request);
}
