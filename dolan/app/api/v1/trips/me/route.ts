import { tripRouteHandlers } from "@/lib/auth/adapter";

export async function GET(request: Request) {
  return tripRouteHandlers.listMine(request);
}
