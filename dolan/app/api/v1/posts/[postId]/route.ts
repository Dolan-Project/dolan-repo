import { proxyToExpress } from "@/lib/auth/express-proxy";

type Ctx = { params: Promise<{ postId: string }> };

export async function DELETE(request: Request, { params }: Ctx) {
  const { postId } = await params;
  return proxyToExpress(request, `/api/v1/posts/${encodeURIComponent(postId)}`);
}
