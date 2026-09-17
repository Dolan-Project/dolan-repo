import { describe, expect, it } from "vitest";
import { redactAuthorizationHeader, redactValue } from "../src/lib/redact.ts";

describe("log redaction", () => {
  it("never keeps bearer tokens in structured logs", () => {
    expect(redactAuthorizationHeader("Bearer mock-verified-complete")).toBe("Bearer [redacted]");
    expect(redactValue({ authorization: "Bearer abc", refresh_token: "xyz" })).toEqual({
      authorization: "[redacted]",
      refresh_token: "[redacted]",
    });
    expect(redactAuthorizationHeader(undefined)).toBeUndefined();
    expect(redactAuthorizationHeader("Basic abc")).toBe("[redacted]");
    expect(redactValue(["ok", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"])).toEqual(["ok", "[redacted]"]);
    expect(redactValue(12)).toBe(12);
    expect(redactValue("short")).toBe("short");
  });
});
