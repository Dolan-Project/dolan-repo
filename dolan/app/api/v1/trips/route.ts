import { tripRouteHandlers } from "@/lib/auth/adapter";

export async function POST(request: Request) {
  return tripRouteHandlers.create(request);
}
