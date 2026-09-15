import { afterEach, describe, expect, it, vi } from "vitest";
import {
  handleLoginRequest,
  handleRegisterRequest,
} from "./handle-auth";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function jsonRequest(url: string, body: unknown) {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Local Express auth when mock is off", () => {
  it("logs in through Express and sets dolan_session cookie", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK_API", "false");
    vi.stubEnv("EXPRESS_ORIGIN", "http://express.test");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            success: true,
            data: {
              accessToken: "local-session-token",
              session: {
                emailVerified: true,
                profileComplete: true,
                user: {
                  id: "11111111-1111-4111-8111-111111111111",
                  username: "alya",
                  displayName: "Alya",
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
            },
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        ),
      ),
    );

    const response = await handleLoginRequest(
      jsonRequest("http://localhost/api/auth/login", {
        email: "verified@dolan.test",
        password: "password123",
      }),
    );
    const json = await response.json();
    expect(response.status).toBe(200);
    expect(json.data.user.username).toBe("alya");
    expect(response.headers.get("set-cookie")).toContain("dolan_session=local-session-token");
  });

  it("registers through Express", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK_API", "false");
    vi.stubEnv("EXPRESS_ORIGIN", "http://express.test");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            success: true,
            data: {
              accessToken: "new-session",
              session: {
                emailVerified: true,
                profileComplete: false,
                user: {
                  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
                  username: "newbie",
                  displayName: "Newbie",
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
            },
          }),
          { status: 201, headers: { "content-type": "application/json" } },
        ),
      ),
    );

    const response = await handleRegisterRequest(
      jsonRequest("http://localhost/api/auth/register", {
        email: "newbie@dolan.test",
        password: "rahasia8",
        confirmPassword: "rahasia8",
        username: "newbie",
        displayName: "Newbie",
      }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("dolan_session=new-session");
  });
});
