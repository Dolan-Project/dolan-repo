import { proxyToExpress } from "@/lib/auth/express-proxy";

type Ctx = { params: Promise<{ token: string }> };

export async function GET(request: Request, { params }: Ctx) {
  const { token } = await params;
  return proxyToExpress(request, `/api/v1/share/${encodeURIComponent(token)}`);
}
