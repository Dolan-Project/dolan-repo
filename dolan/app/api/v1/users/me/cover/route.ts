import { profileRouteHandlers } from "@/lib/auth/adapter";

export async function POST(request: Request) {
  return profileRouteHandlers.cover(request);
}
