import { afterEach, describe, expect, it, vi } from "vitest";
import {
  handleCallbackRequest,
  handleForgotPasswordRequest,
  handleLoginRequest,
  handleLogoutRequest,
  handleRegisterRequest,
  handleResetPasswordRequest,
} from "./handle-auth";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

async function jsonRequest(url: string, body: unknown) {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function readJson(response: Response) {
  return response.json() as Promise<Record<string, unknown>>;
}

describe("handleRegisterRequest", () => {
  it("returns EMAIL_TAKEN for a duplicate email", async () => {
    const response = await handleRegisterRequest(
      await jsonRequest("http://localhost/api/auth/register", {
        email: "taken@dolan.test",
        password: "rahasia8",
        confirmPassword: "rahasia8",
      }),
    );
    const json = await readJson(response);
    expect(json.success).toBe(false);
    expect((json.error as { code: string }).code).toBe("EMAIL_TAKEN");
  });

  it("returns AuthSession without password or token", async () => {
    const response = await handleRegisterRequest(
      await jsonRequest("http://localhost/api/auth/register", {
        email: "rani@dolan.test",
        password: "rahasia8",
        confirmPassword: "rahasia8",
      }),
    );
    const json = await readJson(response);
    expect(json.success).toBe(true);
    const data = json.data as Record<string, unknown>;
    expect("password" in data).toBe(false);
    expect("accessToken" in data).toBe(false);
    expect("email" in (data.user as object)).toBe(false);
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
  });
});

describe("handleLoginRequest", () => {
  it("returns a generic INVALID_CREDENTIALS message", async () => {
    const response = await handleLoginRequest(
      await jsonRequest("http://localhost/api/auth/login", {
        email: "salsa@dolan.test",
        password: "salah123",
      }),
    );
    const json = await readJson(response);
    expect(json.success).toBe(false);
    const error = json.error as { code: string; message: string };
    expect(error.code).toBe("INVALID_CREDENTIALS");
    expect(error.message).toBe(
      "Email atau kata sandi belum cocok. Periksa lagi, atau gunakan Lupa Password.",
    );
  });

  it("returns a session for a valid login", async () => {
    const response = await handleLoginRequest(
      await jsonRequest("http://localhost/api/auth/login", {
        email: "fitria@dolan.id",
        password: "dolan123",
      }),
    );
    const json = await readJson(response);
    expect(json.success).toBe(true);
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
  });
});

describe("handleForgotPasswordRequest", () => {
  it("does not reveal whether the email exists", async () => {
    const response = await handleForgotPasswordRequest(
      await jsonRequest("http://localhost/api/auth/forgot-password", {
        email: "tidakada@dolan.test",
      }),
    );
    const json = await readJson(response);
    expect(json.success).toBe(true);
    expect((json.data as { message: string }).message).toBe(
      "Jika email terdaftar, tautan reset telah dikirim.",
    );
  });
});

describe("handleResetPasswordRequest", () => {
  it("rejects an invalid reset token", async () => {
    const response = await handleResetPasswordRequest(
      await jsonRequest("http://localhost/api/auth/reset-password", {
        token: "expired",
        password: "rahasia8",
        confirmPassword: "rahasia8",
      }),
    );
    const json = await readJson(response);
    expect(json.success).toBe(false);
    expect((json.error as { code: string }).code).toBe("UNAUTHORIZED");
  });
});

describe("handleLogoutRequest", () => {
  it("clears the session cookie", async () => {
    const response = await handleLogoutRequest(
      new Request("http://localhost/api/auth/logout", { method: "POST" }),
    );
    const json = await readJson(response);
    expect(json.success).toBe(true);
    expect(response.headers.get("set-cookie")?.toLowerCase()).toContain(
      "max-age=0",
    );
  });
});

describe("handleCallbackRequest", () => {
  it("redirects to profile edit and sets a pending session cookie", async () => {
    const response = await handleCallbackRequest(
      new Request("http://localhost/api/auth/callback?token=valid"),
    );
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toContain("/profil/edit");
    expect(response.headers.get("set-cookie")).toContain("dolan_session=pending");
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
  });

  it("stores the Express token and follows profileComplete from /users/me", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK_API", "false");
    vi.stubEnv("EXPRESS_ORIGIN", "http://express.test");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            success: true,
            data: {
              emailVerified: true,
              profileComplete: true,
              user: {
                id: "google-user-1",
                username: "alya_maps",
                displayName: "Alya Google",
                avatarUrl: null,
                coverUrl: null,
                bio: null,
                domicile: "Jakarta",
                instagramUrl: null,
                tiktokUrl: null,
                followersCount: 0,
                followingCount: 0,
                hostTripCount: 0,
                participantTripCount: 0,
                rating: {
                  overall: null,
                  communication: null,
                  attitude: null,
                  reviewCount: 0,
                },
              },
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    );

    const response = await handleCallbackRequest(
      new Request("http://localhost/api/auth/callback?token=express-google-token&next=/trip-saya"),
    );
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("http://localhost/trip-saya");
    expect(response.headers.get("set-cookie")).toContain("dolan_session=express-google-token");
    expect(response.headers.get("set-cookie")).not.toContain("dolan_session=pending");
  });

  it("sends incomplete Google users to profile edit using the Express session", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK_API", "false");
    vi.stubEnv("EXPRESS_ORIGIN", "http://express.test");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            success: true,
            data: {
              emailVerified: true,
              profileComplete: false,
              user: {
                id: "google-user-2",
                username: "",
                displayName: "Fitria",
                avatarUrl: null,
                coverUrl: null,
                bio: null,
                domicile: null,
                instagramUrl: null,
                tiktokUrl: null,
                followersCount: 0,
                followingCount: 0,
                hostTripCount: 0,
                participantTripCount: 0,
                rating: {
                  overall: null,
                  communication: null,
                  attitude: null,
                  reviewCount: 0,
                },
              },
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    );

    const response = await handleCallbackRequest(
      new Request("http://localhost/api/auth/callback?token=new-google-token"),
    );
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toContain("/profil/edit");
    expect(response.headers.get("set-cookie")).toContain("dolan_session=new-google-token");
  });
});
