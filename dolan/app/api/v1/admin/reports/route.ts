import { communityRouteHandlers } from "@/lib/community/adapter";

export async function GET(request: Request) {
  return communityRouteHandlers.adminReports(request);
}
