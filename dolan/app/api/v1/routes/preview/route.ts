import { proxyToExpress } from "@/lib/auth/express-proxy";

export async function POST(request: Request) {
  return proxyToExpress(request, "/api/v1/routes/preview");
}
