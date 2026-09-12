import { describe, expect, it } from "vitest";
import { MAX_UPLOAD_BYTES, validateUploadMeta } from "./upload.js";

describe("validateUploadMeta", () => {
  it("rejects a type that is not jpg, png, or webp", () => {
    const result = validateUploadMeta({ type: "image/gif", size: 100 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("UPLOAD_INVALID_TYPE");
    }
  });

  it("rejects files larger than 2MB", () => {
    const result = validateUploadMeta({
      type: "image/jpeg",
      size: MAX_UPLOAD_BYTES + 1,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("UPLOAD_TOO_LARGE");
    }
  });

  it("accepts a 2MB jpeg", () => {
    const result = validateUploadMeta({
      type: "image/jpeg",
      size: MAX_UPLOAD_BYTES,
    });
    expect(result.ok).toBe(true);
  });
});
