import { proxyToExpress } from "@/lib/auth/express-proxy";

export async function GET(request: Request) {
  return proxyToExpress(request, "/api/v1/posts");
}

export async function POST(request: Request) {
  return proxyToExpress(request, "/api/v1/posts");
}
