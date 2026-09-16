import { env } from "../../config/env.ts";

function authorization() { return `Basic ${Buffer.from(`${env.imagekitPrivateKey}:`).toString("base64")}`; }

export async function uploadProfileImage(input: { bytes: Uint8Array; fileName: string; mimeType: string; userId: string; kind: "avatar" | "cover" }) {
  return uploadImageKitFile({
    ...input,
    folder: `/dolan/users/${input.userId}`,
    tags: `profile,${input.kind}`,
  });
}

export async function uploadPostImage(input: { bytes: Uint8Array; fileName: string; mimeType: string; userId: string }) {
  return uploadImageKitFile({
    ...input,
    folder: `/dolan/users/${input.userId}/posts`,
    tags: "post",
  });
}

async function uploadImageKitFile(input: {
  bytes: Uint8Array;
  fileName: string;
  mimeType: string;
  folder: string;
  tags: string;
}) {
  if (!env.imagekitPrivateKey || !env.imagekitPublicKey || !env.imagekitUrlEndpoint) throw new Error("IMAGEKIT_NOT_CONFIGURED");
  const form = new FormData();
  const payload = new ArrayBuffer(input.bytes.byteLength);
  new Uint8Array(payload).set(input.bytes);
  form.set("file", new Blob([payload], { type: input.mimeType }), input.fileName);
  form.set("fileName", input.fileName);
  form.set("folder", input.folder);
  form.set("useUniqueFileName", "true");
  form.set("tags", input.tags);
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
