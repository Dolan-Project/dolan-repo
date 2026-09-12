import { profileRouteHandlers } from "@/lib/auth/adapter";

export async function GET(request: Request) {
  return profileRouteHandlers.me.GET(request);
}

export async function PATCH(request: Request) {
  return profileRouteHandlers.me.PATCH(request);
}
