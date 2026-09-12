import type { ApiError } from "@dolan/shared";

export const MOCK_SCENARIOS = [
  "success",
  "empty",
  "unauthorized",
  "validationError",
  "quotaError",
  "providerError",
] as const;

export type MockScenario = (typeof MOCK_SCENARIOS)[number];

export function createApiError(
  code: string,
  message: string,
  requestId = "req_mock",
  fields?: Record<string, string>,
): ApiError {
  return {
    success: false,
    error: { code, message, requestId, ...(fields ? { fields } : {}) },
  };
}
