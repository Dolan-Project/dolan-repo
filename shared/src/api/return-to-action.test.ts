import { describe, expect, it } from "vitest";
import {
  DEFAULT_POST_AUTH_PATH,
  DEFAULT_POST_LOGOUT_PATH,
  isAllowedNextPath,
  resolvePostAuthPath,
} from "./return-to-action.js";

describe("isAllowedNextPath", () => {
  it("allows listed app paths", () => {
    expect(isAllowedNextPath("/")).toBe(true);
    expect(isAllowedNextPath("/buat-trip")).toBe(true);
    expect(isAllowedNextPath("/profil")).toBe(true);
    expect(isAllowedNextPath("/trip-saya")).toBe(true);
    expect(isAllowedNextPath("/jelajah")).toBe(true);
    expect(isAllowedNextPath("/wisata/bali")).toBe(true);
    expect(isAllowedNextPath("/trip/t1")).toBe(true);
  });

  it("rejects open redirects and unsafe schemes", () => {
    expect(isAllowedNextPath("https://phish.test")).toBe(false);
    expect(isAllowedNextPath("//evil.com")).toBe(false);
    expect(isAllowedNextPath("javascript:alert(1)")).toBe(false);
    expect(isAllowedNextPath("/itinerary/bali-3h2m")).toBe(false);
    expect(isAllowedNextPath("/trip//evil.com")).toBe(false);
    expect(isAllowedNextPath("/wisata//evil.com")).toBe(false);
  });
});

describe("resolvePostAuthPath", () => {
  it("falls back to home when next is missing or invalid", () => {
    expect(resolvePostAuthPath(undefined)).toBe(DEFAULT_POST_AUTH_PATH);
    expect(resolvePostAuthPath("https://phish.test")).toBe(
      DEFAULT_POST_AUTH_PATH,
    );
    expect(resolvePostAuthPath("/trip//evil.com")).toBe("/");
    expect(resolvePostAuthPath("/wisata//evil.com")).toBe("/");
  });

  it("returns the next path when allowed", () => {
    expect(resolvePostAuthPath("/buat-trip")).toBe("/buat-trip");
    expect(resolvePostAuthPath("/trip/t1")).toBe("/trip/t1");
  });

  it("keeps logout default at home", () => {
    expect(DEFAULT_POST_LOGOUT_PATH).toBe("/");
  });
});
