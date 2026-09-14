import { communityRouteHandlers } from "@/lib/community/adapter";

export async function POST(request: Request) {
  return communityRouteHandlers.reports(request);
}
