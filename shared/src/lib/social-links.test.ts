import { describe, expect, it } from "vitest";
import { instagramProfileUrl, socialHandleFromUrl, tiktokProfileUrl } from "./social-links.ts";

describe("instagramProfileUrl", () => {
  it("accepts a handle, @handle, or profile URL", () => {
    expect(instagramProfileUrl("salsa.trek")).toBe("https://www.instagram.com/salsa.trek");
    expect(instagramProfileUrl("@salsa.trek")).toBe("https://www.instagram.com/salsa.trek");
    expect(instagramProfileUrl("https://instagram.com/salsa.trek/")).toBe(
      "https://www.instagram.com/salsa.trek",
    );
  });

  it("rejects empty and invalid handles", () => {
    expect(instagramProfileUrl("")).toBeNull();
    expect(instagramProfileUrl("https://example.com/salsa")).toBeNull();
    expect(instagramProfileUrl("bad handle")).toBeNull();
  });
});

describe("tiktokProfileUrl", () => {
  it("accepts a handle or TikTok URL", () => {
    expect(tiktokProfileUrl("salsa_trek")).toBe("https://www.tiktok.com/@salsa_trek");
    expect(tiktokProfileUrl("@salsa_trek")).toBe("https://www.tiktok.com/@salsa_trek");
    expect(tiktokProfileUrl("https://www.tiktok.com/@salsa_trek")).toBe(
      "https://www.tiktok.com/@salsa_trek",
    );
  });

  it("rejects empty and invalid handles", () => {
    expect(tiktokProfileUrl("")).toBeNull();
    expect(tiktokProfileUrl("x")).toBeNull();
    expect(tiktokProfileUrl("https://example.com/@salsa")).toBeNull();
  });
});

describe("socialHandleFromUrl", () => {
  it("returns the username from a stored profile URL", () => {
    expect(socialHandleFromUrl("https://www.instagram.com/salsa.trek")).toBe("salsa.trek");
    expect(socialHandleFromUrl("https://www.tiktok.com/@salsa_trek")).toBe("salsa_trek");
    expect(socialHandleFromUrl(null)).toBe("");
  });
});
