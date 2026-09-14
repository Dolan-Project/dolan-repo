import { describe, expect, it } from "vitest";
import { extractAccessTokenFromCookies } from "../src/socket/cookie-auth.ts";

describe("socket cookie extraction", () => {
  it("returns null when no auth cookie is present", () => {
    expect(extractAccessTokenFromCookies("theme=light")).toBeNull();
  });

  it("reads dolan_session local auth cookie", () => {
    const token = extractAccessTokenFromCookies(
      "theme=light; dolan_session=local-token-abc; sb-access-token=ignored",
    );
    expect(token).toBe("local-token-abc");
  });

  it("ignores legacy Supabase cookies", () => {
    const payload = Buffer.from(
      JSON.stringify({
        access_token: "mock-verified-complete",
        refresh_token: "refresh-must-not-be-used",
      }),
    ).toString("base64");
    expect(extractAccessTokenFromCookies(`sb-local-auth-token=base64-${payload}`)).toBeNull();
  });
});
