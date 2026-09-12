import { describe, expect, it } from "vitest";
import { extractAccessTokenFromCookies } from "../src/socket/cookie-auth.ts";

describe("socket cookie extraction", () => {
  it("reads access_token from a Supabase SSR cookie and ignores refresh_token", () => {
    const payload = Buffer.from(
      JSON.stringify({
        access_token: "mock-verified-complete",
        refresh_token: "refresh-must-not-be-used",
      }),
    ).toString("base64");

    const token = extractAccessTokenFromCookies(
      `sb-local-auth-token=base64-${payload}`,
      "sb-",
    );

    expect(token).toBe("mock-verified-complete");
  });

  it("returns null when no auth cookie is present", () => {
    expect(extractAccessTokenFromCookies("theme=light", "sb-")).toBeNull();
  });
});
