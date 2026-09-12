import { describe, expect, it } from "vitest";
import {
  SESSION_COOKIE,
  readSessionId,
  sessionCookieHeader,
} from "./session-cookie";

describe("sessionCookieHeader", () => {
  it("sets an HttpOnly session cookie and never uses localStorage keys", () => {
    const header = sessionCookieHeader("pending");
    expect(header).toContain(`${SESSION_COOKIE}=pending`);
    expect(header.toLowerCase()).toContain("httponly");
    expect(header.toLowerCase()).toContain("samesite=lax");
    expect(header.toLowerCase()).toContain("path=/");
  });

  it("clears the cookie on logout", () => {
    const header = sessionCookieHeader(null);
    expect(header.toLowerCase()).toContain("max-age=0");
  });
});

describe("readSessionId", () => {
  it("reads the session id from a Cookie header", () => {
    expect(readSessionId("theme=light; dolan_session=complete")).toBe(
      "complete",
    );
    expect(readSessionId(null)).toBeNull();
  });
});
