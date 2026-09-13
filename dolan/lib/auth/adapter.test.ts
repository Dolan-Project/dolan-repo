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

describe("profileRouteHandlers.me.PATCH", () => {
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
            user: { username: "dimas_baru" },
          },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await profileRouteHandlers.me.PATCH(
      new Request("http://localhost/api/v1/users/me", {
        method: "PATCH",
        headers: {
          cookie: "dolan_session=sb-access",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          username: "dimas_baru",
          displayName: "Dimas",
          domicile: "Bali",
        }),
      }),
    );
    const json = (await response.json()) as {
      success: true;
      data: { user: { username: string } };
    };
    expect(json.data.user.username).toBe("dimas_baru");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toBe("http://127.0.0.1:4000/api/v1/users/me");
  });
});

describe("profileRouteHandlers.byUsername", () => {
  it("proxies public profile to Express when mock API is disabled", async () => {
    vi.stubEnv("NEXT_PUBLIC_USE_MOCK_API", "false");
    vi.stubEnv("EXPRESS_ORIGIN", "http://127.0.0.1:4000");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ success: true, data: { username: "alya", displayName: "Alya" } }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await profileRouteHandlers.byUsername(
      new Request("http://localhost/api/v1/users/alya"),
      "alya",
    );
    const json = (await response.json()) as {
      success: true;
      data: { username: string };
    };
    expect(json.data.username).toBe("alya");
    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toBe("http://127.0.0.1:4000/api/v1/users/alya");
  });
});
