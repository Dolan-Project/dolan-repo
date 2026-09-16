import { describe, expect, it } from "vitest";
import { jsonResult, statusForCode } from "./api-response";

describe("statusForCode", () => {
  it("maps known API error codes to HTTP statuses", () => {
    expect(statusForCode("EMAIL_TAKEN")).toBe(409);
    expect(statusForCode("USERNAME_TAKEN")).toBe(409);
    expect(statusForCode("INVALID_CREDENTIALS")).toBe(401);
    expect(statusForCode("UNAUTHORIZED")).toBe(401);
    expect(statusForCode("RATE_LIMITED")).toBe(429);
    expect(statusForCode("PROVIDER_UNAVAILABLE")).toBe(503);
    expect(statusForCode("NOT_FOUND")).toBe(404);
    expect(statusForCode("TRIP_NOT_FOUND")).toBe(404);
    expect(statusForCode("FORBIDDEN")).toBe(403);
    expect(statusForCode("EMAIL_UNVERIFIED")).toBe(403);
    expect(statusForCode("TRIP_FULL")).toBe(409);
    expect(statusForCode("BLOCKED_RELATION")).toBe(400);
    expect(statusForCode("WEIRD")).toBe(400);
  });

  it("can attach a session cookie", () => {
    const response = jsonResult({ success: true, data: {} }, 200, "sess");
    expect(response.headers.get("set-cookie")).toMatch(/dolan_session=sess/);
  });
});
