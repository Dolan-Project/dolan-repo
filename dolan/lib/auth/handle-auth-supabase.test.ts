import { afterEach, describe, expect, it, vi } from "vitest";

const signInWithPassword = vi.fn();
const signUp = vi.fn();
const exchangeCodeForSession = vi.fn();

vi.mock("./supabase-anon", () => ({
  getSupabaseAnon: () => ({
    auth: {
      signInWithPassword,
      signUp,
      exchangeCodeForSession,
    },
  }),
}));

import {
  handleCallbackRequest,
  handleLoginRequest,
  handleRegisterRequest,
} from "./handle-auth";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  signInWithPassword.mockReset();
  signUp.mockReset();
  exchangeCodeForSession.mockReset();
});

function jsonRequest(url: string, body: unknown) {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Supabase password auth when mock is off", () => {
  it("logs in through Supabase and does not return the access token", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK_API", "false");
    vi.stubEnv("EXPRESS_ORIGIN", "");
    signInWithPassword.mockResolvedValue({
      data: {
        session: { access_token: "sb-access-token" },
        user: {
          id: "user-1",
          email: "salsa@dolan.test",
          email_confirmed_at: "2026-01-01T00:00:00.000Z",
          user_metadata: { username: "salsa", display_name: "Salsa", domicile: "Jakarta" },
        },
      },
      error: null,
    });

    const response = await handleLoginRequest(
      jsonRequest("http://localhost/api/auth/login", {
        email: "salsa@dolan.test",
        password: "rahasia8",
      }),
    );
    const json = (await response.json()) as {
      success: true;
      data: { user: { username: string; email?: string }; accessToken?: string };
    };

    expect(signInWithPassword).toHaveBeenCalledTimes(1);
    expect(json.success).toBe(true);
    expect(json.data.user.username).toBe("salsa");
    expect(json.data.accessToken).toBeUndefined();
    expect("email" in json.data.user).toBe(false);
    expect(JSON.stringify(json)).not.toContain("sb-access-token");
    expect(response.headers.get("set-cookie")).toContain("dolan_session=sb-access-token");
  });

  it("maps a duplicate register to EMAIL_TAKEN", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK_API", "false");
    vi.stubEnv("EXPRESS_ORIGIN", "");
    signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: "User already registered" },
    });

    const response = await handleRegisterRequest(
      jsonRequest("http://localhost/api/auth/register", {
        email: "taken@dolan.test",
        password: "rahasia8",
        confirmPassword: "rahasia8",
      }),
    );
    const json = (await response.json()) as {
      success: false;
      error: { code: string };
    };
    expect(json.error.code).toBe("EMAIL_TAKEN");
  });

  it("exchanges a callback code for a session cookie", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK_API", "false");
    vi.stubEnv("EXPRESS_ORIGIN", "");
    exchangeCodeForSession.mockResolvedValue({
      data: {
        session: { access_token: "sb-callback-token" },
        user: {
          id: "user-2",
          email_confirmed_at: "2026-01-01T00:00:00.000Z",
          user_metadata: {},
        },
      },
      error: null,
    });

    const response = await handleCallbackRequest(
      new Request("http://localhost/api/auth/callback?code=ok&next=/profil"),
    );
    expect(response.status).toBe(302);
    expect(response.headers.get("set-cookie")).toContain("dolan_session=sb-callback-token");
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
  });
});
