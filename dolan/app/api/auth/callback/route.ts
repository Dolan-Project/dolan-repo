import { authRouteHandlers } from "@/lib/auth/adapter";

export async function GET(request: Request) {
  return authRouteHandlers.callback(request);
}
