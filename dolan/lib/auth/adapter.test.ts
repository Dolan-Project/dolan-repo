import { afterEach, describe, expect, it, vi } from "vitest";
import { profileRouteHandlers } from "./adapter";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("profileRouteHandlers.me.GET", () => {
  it("keeps the typed mock when mock API is enabled", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK_API", "true");
    const response = await profileRouteHandlers.me.GET(
      new Request("http://localhost/api/v1/users/me", {
        headers: { cookie: "dolan_session=complete" },
      }),
    );
    const json = (await response.json()) as {
      success: true;
      data: { user: { username: string } };
    };
    expect(json.success).toBe(true);
    expect(json.data.user.username).toBe("salsa");
  });

  it("proxies to Express when mock API is disabled", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK_API", "false");
    vi.stubEnv("EXPRESS_ORIGIN", "http://127.0.0.1:4000");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            emailVerified: true,
            profileComplete: true,
            user: { username: "alya" },
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await profileRouteHandlers.me.GET(
      new Request("http://localhost/api/v1/users/me", {
        headers: { cookie: "dolan_session=mock-verified-complete" },
      }),
    );
    const json = (await response.json()) as {
      success: true;
      data: { user: { username: string } };
    };
    expect(json.data.user.username).toBe("alya");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
