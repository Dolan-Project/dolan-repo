import { env } from "../../config/env.ts";

function authorization() { return `Basic ${Buffer.from(`${env.imagekitPrivateKey}:`).toString("base64")}`; }

export async function uploadProfileImage(input: { bytes: Uint8Array; fileName: string; mimeType: string; userId: string; kind: "avatar" | "cover" }) {
  if (!env.imagekitPrivateKey || !env.imagekitPublicKey || !env.imagekitUrlEndpoint) throw new Error("IMAGEKIT_NOT_CONFIGURED");
  const form = new FormData();
  const payload = new ArrayBuffer(input.bytes.byteLength);
  new Uint8Array(payload).set(input.bytes);
  form.set("file", new Blob([payload], { type: input.mimeType }), input.fileName);
  form.set("fileName", input.fileName);
  form.set("folder", `/dolan/users/${input.userId}`);
  form.set("useUniqueFileName", "true");
  form.set("tags", `profile,${input.kind}`);
  const response = await fetch("https://upload.imagekit.io/api/v1/files/upload", { method: "POST", headers: { Authorization: authorization() }, body: form });
  if (!response.ok) throw new Error("IMAGEKIT_UPLOAD_FAILED");
  const data = await response.json() as { url?: string; fileId?: string };
  if (!data.url || !data.fileId) throw new Error("IMAGEKIT_UPLOAD_FAILED");
  return { url: data.url, fileId: data.fileId };
}

export async function deleteImageKitFile(fileId: string) {
  if (!env.imagekitPrivateKey || !fileId) return;
  await fetch(`https://api.imagekit.io/v1/files/${encodeURIComponent(fileId)}`, { method: "DELETE", headers: { Authorization: authorization() } });
}
