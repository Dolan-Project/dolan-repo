import {
  AUTH_ERROR_CODES,
  isProfileComplete,
  type ApiError,
  type ApiSuccess,
  type AuthSession,
  type PublicUser,
} from "@/lib/contracts";
import { sampleAuthSession, samplePublicUser } from "./fixtures";
import { createApiError, type MockScenario } from "./scenarios";

export function mockGetMe(
  scenario: MockScenario,
): ApiSuccess<AuthSession> | ApiError {
  if (scenario === "unauthorized") {
    return createApiError(AUTH_ERROR_CODES.UNAUTHORIZED, "Tidak sah");
  }
  if (scenario === "empty") {
    return createApiError("NOT_FOUND", "Profil tidak ditemukan");
  }
  return { success: true, data: sampleAuthSession };
}

export function mockGetPublicProfile(
  scenario: MockScenario,
): ApiSuccess<PublicUser> | ApiError {
  if (scenario === "empty") {
    return createApiError("NOT_FOUND", "Pengguna tidak ditemukan");
  }
  return { success: true, data: samplePublicUser };
}

export function mockPatchMe(
  scenario: MockScenario,
): ApiSuccess<AuthSession> | ApiError {
  if (scenario === "unauthorized") {
    return createApiError(AUTH_ERROR_CODES.UNAUTHORIZED, "Tidak sah");
  }
  if (scenario === "validationError") {
    return createApiError("USERNAME_TAKEN", "Username sudah dipakai", "req_mock", {
      username: "Username sudah dipakai",
    });
  }
  return {
    success: true,
    data: {
      ...sampleAuthSession,
      profileComplete: isProfileComplete(samplePublicUser),
    },
  };
}
