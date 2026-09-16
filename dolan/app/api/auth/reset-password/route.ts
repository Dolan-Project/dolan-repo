import { authRouteHandlers } from "@/lib/auth/adapter";

export async function POST(request: Request) {
  return authRouteHandlers.resetPassword(request);
}
