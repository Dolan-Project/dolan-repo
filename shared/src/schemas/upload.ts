export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

export const ALLOWED_UPLOAD_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type UploadMeta = {
  type: string;
  size: number;
};

export type UploadValidation =
  | { ok: true }
  | { ok: false; code: "UPLOAD_INVALID_TYPE" | "UPLOAD_TOO_LARGE"; message: string };

export function validateUploadMeta(file: UploadMeta): UploadValidation {
  if (!ALLOWED_UPLOAD_TYPES.includes(file.type as (typeof ALLOWED_UPLOAD_TYPES)[number])) {
    return {
      ok: false,
      code: "UPLOAD_INVALID_TYPE",
      message: "Gunakan JPG, PNG, atau WebP",
    };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      code: "UPLOAD_TOO_LARGE",
      message: "Ukuran file maksimal 2MB",
    };
  }
  return { ok: true };
}
