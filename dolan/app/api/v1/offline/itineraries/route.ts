import { communityRouteHandlers } from "@/lib/community/adapter";

export async function GET(request: Request) {
  return communityRouteHandlers.offline.GET(request);
}

export async function POST(request: Request) {
  return communityRouteHandlers.offline.POST(request);
}
