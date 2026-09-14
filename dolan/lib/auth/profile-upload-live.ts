import { proxyToExpress } from "./express-proxy";

export async function proxyProfileUpload(request: Request, kind: "avatar" | "cover") {
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ success: false, error: { code: "UPLOAD_INVALID_TYPE", message: "File unggahan wajib ada" } }, { status: 400 });
  const headers = new Headers(request.headers);
  headers.set("content-type", file.type);
  headers.set("content-length", String(file.size));
  const binaryRequest = new Request(request.url, { method: "POST", headers, body: await file.arrayBuffer() });
  return proxyToExpress(binaryRequest, `/api/v1/auth/uploads/profile/${kind}`);
}
