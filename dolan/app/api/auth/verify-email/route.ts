import { authRouteHandlers } from "@/lib/auth/adapter";

export async function GET(request: Request) {
  return authRouteHandlers.verifyEmail(request);
}

export async function POST(request: Request) {
  return authRouteHandlers.verifyEmail(request);
}
