import { afterEach, describe, expect, it, vi } from "vitest";
import { shouldUseMockApi } from "./use-mock";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("shouldUseMockApi", () => {
  it("is true when NEXT_PUBLIC_USE_MOCK_API is true", () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK_API", "true");
    vi.stubEnv("NODE_ENV", "test");
    expect(shouldUseMockApi()).toBe(true);
  });

  it("is false when the mock flag is off", () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK_API", "false");
    expect(shouldUseMockApi()).toBe(false);
  });

  it("warns in production mock mode", () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK_API", "true");
    vi.stubEnv("NODE_ENV", "production");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(shouldUseMockApi()).toBe(true);
    expect(warn).toHaveBeenCalled();
  });
});
