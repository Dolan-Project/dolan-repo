import {
  AUTH_ERROR_CODES,
  type ApiError,
  type ApiSuccess,
  type AuthSession,
} from "@/lib/contracts";
import { sampleAuthSession } from "./fixtures";
import { createApiError, type MockScenario } from "./scenarios";

type AuthResult = ApiSuccess<AuthSession> | ApiError;
type MessageResult = ApiSuccess<{ message: string }> | ApiError;

export function mockRegister(scenario: MockScenario): AuthResult {
  if (scenario === "validationError") {
    return createApiError(AUTH_ERROR_CODES.EMAIL_TAKEN, "Email sudah terdaftar");
  }
  if (scenario === "unauthorized") {
    return createApiError(AUTH_ERROR_CODES.UNAUTHORIZED, "Tidak sah");
  }
  if (scenario === "quotaError" || scenario === "providerError") {
    return createApiError("PROVIDER_UNAVAILABLE", "Layanan auth tidak tersedia");
  }
  return { success: true, data: sampleAuthSession };
}

export function mockLogin(scenario: MockScenario): AuthResult {
  if (scenario === "validationError" || scenario === "unauthorized") {
    return createApiError(
      AUTH_ERROR_CODES.INVALID_CREDENTIALS,
      "Email atau kata sandi belum cocok. Periksa lagi, atau gunakan Lupa Password.",
    );
  }
  if (scenario === "quotaError") {
    return createApiError(AUTH_ERROR_CODES.RATE_LIMITED, "Terlalu banyak percobaan");
  }
  if (scenario === "providerError") {
    return createApiError("PROVIDER_UNAVAILABLE", "Layanan auth tidak tersedia");
  }
  return { success: true, data: sampleAuthSession };
}

export function mockLogout(scenario: MockScenario): ApiSuccess<null> | ApiError {
  if (scenario === "unauthorized") {
    return createApiError(AUTH_ERROR_CODES.UNAUTHORIZED, "Tidak sah");
  }
  return { success: true, data: null };
}

export function mockForgotPassword(scenario: MockScenario): MessageResult {
  if (scenario === "providerError") {
    return createApiError("PROVIDER_UNAVAILABLE", "Layanan email tidak tersedia");
  }
  return {
    success: true,
    data: { message: "Jika email terdaftar, tautan reset telah dikirim." },
  };
}

export function mockResetPassword(scenario: MockScenario): MessageResult {
  if (scenario === "unauthorized") {
    return createApiError(AUTH_ERROR_CODES.UNAUTHORIZED, "Token reset tidak sah");
  }
  return { success: true, data: { message: "Password diperbarui." } };
}
