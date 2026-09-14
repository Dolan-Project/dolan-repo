import { proxyToExpress } from "@/lib/auth/express-proxy";

type Ctx = { params: Promise<{ token: string }> };
export async function POST(request: Request, { params }: Ctx) {
  const { token } = await params;
  return proxyToExpress(request, `/api/v1/trip-invitations/${encodeURIComponent(token)}/accept`);
}
