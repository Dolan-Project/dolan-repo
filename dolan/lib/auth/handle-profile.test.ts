import { describe, expect, it } from "vitest";
import {
  handleGetMeRequest,
  handleGetPublicProfileRequest,
  handlePatchMeRequest,
  handleUploadRequest,
} from "./handle-profile";

describe("handleGetMeRequest", () => {
  it("returns UNAUTHORIZED without a session cookie", async () => {
    const response = await handleGetMeRequest(
      new Request("http://localhost/api/v1/users/me"),
    );
    const json = (await response.json()) as {
      success: boolean;
      error: { code: string };
    };
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("UNAUTHORIZED");
  });

  it("returns the session when the cookie is present", async () => {
    const response = await handleGetMeRequest(
      new Request("http://localhost/api/v1/users/me", {
        headers: { cookie: "dolan_session=complete" },
      }),
    );
    const json = (await response.json()) as {
      success: boolean;
      data: { user: { username: string } };
    };
    expect(json.success).toBe(true);
    expect(json.data.user.username).toBe("salsa");
  });
});

describe("handlePatchMeRequest", () => {
  it("returns USERNAME_TAKEN for a duplicate username", async () => {
    const response = await handlePatchMeRequest(
      new Request("http://localhost/api/v1/users/me", {
        method: "PATCH",
        headers: {
          cookie: "dolan_session=pending",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          username: "taken",
          displayName: "Rani",
          domicile: "Bandung",
        }),
      }),
    );
    const json = (await response.json()) as {
      success: boolean;
      error: { code: string };
    };
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("USERNAME_TAKEN");
  });
});

describe("handlePatchMeRequest social links", () => {
  it("stores canonical Instagram and TikTok URLs", async () => {
    const response = await handlePatchMeRequest(
      new Request("http://localhost/api/v1/users/me", {
        method: "PATCH",
        headers: {
          cookie: "dolan_session=complete",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          username: "salsa",
          displayName: "Salsa",
          domicile: "Jakarta",
          instagramUrl: "@salsa.trek",
          tiktokUrl: "salsa_trek",
        }),
      }),
    );
    const json = (await response.json()) as {
      success: boolean;
      data: { user: { instagramUrl: string | null; tiktokUrl: string | null } };
    };
    expect(json.success).toBe(true);
    expect(json.data.user.instagramUrl).toBe("https://www.instagram.com/salsa.trek");
    expect(json.data.user.tiktokUrl).toBe("https://www.tiktok.com/@salsa_trek");
  });
});

describe("handleGetPublicProfileRequest", () => {
  it("returns NOT_FOUND for an unknown username", async () => {
    const response = await handleGetPublicProfileRequest("tidak-ada");
    const json = (await response.json()) as {
      success: boolean;
      error: { code: string };
    };
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("NOT_FOUND");
  });
});

describe("handleUploadRequest", () => {
  it("rejects a gif upload", async () => {
    const form = new FormData();
    form.append(
      "file",
      new File(["gif"], "anim.gif", { type: "image/gif" }),
    );
    const response = await handleUploadRequest(
      new Request("http://localhost/api/v1/users/me/avatar", {
        method: "POST",
        headers: { cookie: "dolan_session=complete" },
        body: form,
      }),
      "avatar",
    );
    const json = (await response.json()) as {
      success: boolean;
      error: { code: string };
    };
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("UPLOAD_INVALID_TYPE");
  });
});
