import { proxyToExpress } from "@/lib/auth/express-proxy";

type Ctx = { params: Promise<{ postId: string; commentId: string }> };

export async function DELETE(request: Request, { params }: Ctx) {
  const { postId, commentId } = await params;
  return proxyToExpress(
    request,
    `/api/v1/posts/${encodeURIComponent(postId)}/comments/${encodeURIComponent(commentId)}`,
  );
}
