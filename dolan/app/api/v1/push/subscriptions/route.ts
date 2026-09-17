import { NextRequest } from "next/server";
import { proxyToExpress } from "@/lib/auth/express-proxy";

export async function POST(request: NextRequest) {
  const json = await request.json().catch(() => ({}));
  return proxyToExpress(request, "/api/v1/push/subscriptions", {
    method: "POST",
    json,
  });
}

export async function DELETE(request: NextRequest) {
  const json = await request.json().catch(() => ({}));
  return proxyToExpress(request, "/api/v1/push/subscriptions", {
    method: "DELETE",
    json,
  });
}
