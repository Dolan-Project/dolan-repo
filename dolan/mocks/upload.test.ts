import { describe, expect, it } from "vitest";
import { mockUploadAvatar, mockUploadCover } from "./upload";

describe("upload mocks", () => {
  it("rejects gif and oversized files before returning a url", () => {
    const type = mockUploadAvatar({ type: "image/gif", size: 100 });
    expect(type.success).toBe(false);
    if (!type.success) {
      expect(type.error.code).toBe("UPLOAD_INVALID_TYPE");
    }

    const size = mockUploadCover({
      type: "image/png",
      size: 2 * 1024 * 1024 + 1,
    });
    expect(size.success).toBe(false);
    if (!size.success) {
      expect(size.error.code).toBe("UPLOAD_TOO_LARGE");
    }
  });

  it("returns an avatar url without email or token", () => {
    const result = mockUploadAvatar({ type: "image/webp", size: 2048 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.avatarUrl).toContain("avatar");
      expect("email" in result.data).toBe(false);
      expect("token" in result.data).toBe(false);
    }
  });
});
