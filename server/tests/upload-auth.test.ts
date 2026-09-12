import { describe, expect, it } from "vitest";
import { authorizeProfileUpload } from "../src/middleware/upload-auth.ts";

describe("upload authorization", () => {
  it("allows a user to upload their own avatar", () => {
    expect(() =>
      authorizeProfileUpload("user-1", {
        ownerUserId: "user-1",
        mimeType: "image/png",
        byteSize: 1024,
        kind: "avatar",
      }),
    ).not.toThrow();
  });

  it("rejects uploading another user asset", () => {
    expect(() =>
      authorizeProfileUpload("user-1", {
        ownerUserId: "user-2",
        mimeType: "image/png",
        byteSize: 1024,
        kind: "cover",
      }),
    ).toThrow(/own profile assets/);
  });
});
