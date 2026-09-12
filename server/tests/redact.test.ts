import { describe, expect, it } from "vitest";
import { redactAuthorizationHeader, redactValue } from "../src/lib/redact.ts";

describe("log redaction", () => {
  it("never keeps bearer tokens in structured logs", () => {
    expect(redactAuthorizationHeader("Bearer mock-verified-complete")).toBe("Bearer [redacted]");
    expect(redactValue({ authorization: "Bearer abc", refresh_token: "xyz" })).toEqual({
      authorization: "[redacted]",
      refresh_token: "[redacted]",
    });
  });
});
