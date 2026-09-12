import {
  validateUploadMeta,
  type ApiError,
  type ApiSuccess,
} from "@/lib/contracts";
import { createApiError } from "./scenarios";

type AvatarResult = ApiSuccess<{ avatarUrl: string }> | ApiError;
type CoverResult = ApiSuccess<{ coverUrl: string }> | ApiError;

export function mockUploadAvatar(file: {
  type: string;
  size: number;
}): AvatarResult {
  const check = validateUploadMeta(file);
  if (!check.ok) {
    return createApiError(check.code, check.message);
  }
  return { success: true, data: { avatarUrl: "/mock/avatar.webp" } };
}

export function mockUploadCover(file: {
  type: string;
  size: number;
}): CoverResult {
  const check = validateUploadMeta(file);
  if (!check.ok) {
    return createApiError(check.code, check.message);
  }
  return { success: true, data: { coverUrl: "/mock/cover.webp" } };
}
