import { afterEach, describe, expect, it, vi } from "vitest";
import { extractAccessToken, proxyToExpress } from "./express-proxy";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("extractAccessToken", () => {
  it("reads a Bearer header first", () => {
    const request = new Request("http://localhost/api/v1/users/me", {
      headers: {
        authorization: "Bearer mock-verified-complete",
        cookie: "dolan_session=complete",
      },
    });
    expect(extractAccessToken(request)).toBe("mock-verified-complete");
  });

  it("falls back to the dolan_session cookie", () => {
    const request = new Request("http://localhost/api/v1/trips", {
      headers: { cookie: "dolan_session=complete" },
    });
    expect(extractAccessToken(request)).toBe("complete");
  });

  it("ignores an empty Bearer token", () => {
    const request = new Request("http://localhost/api/v1/users/me", {
      headers: { authorization: "Bearer   " },
    });
    expect(extractAccessToken(request)).toBeNull();
  });
});

describe("proxyToExpress", () => {
  it("returns PROVIDER_UNAVAILABLE without EXPRESS_ORIGIN", async () => {
    vi.stubEnv("EXPRESS_ORIGIN", "");
    const response = await proxyToExpress(
      new Request("http://localhost/api/v1/users/me"),
      "/api/v1/users/me",
    );
    const json = (await response.json()) as {
      success: boolean;
      error: { code: string };
    };
    expect(response.status).toBe(503);
    expect(json.success).toBe(false);
    expect(json.error.code).toBe("PROVIDER_UNAVAILABLE");
  });

  it("forwards GET /users/me with a Bearer token", async () => {
    vi.stubEnv("EXPRESS_ORIGIN", "http://127.0.0.1:4000");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: { emailVerified: true, profileComplete: true, user: { username: "alya" } },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await proxyToExpress(
      new Request("http://localhost/api/v1/users/me", {
        headers: { cookie: "dolan_session=mock-verified-complete" },
      }),
      "/api/v1/users/me",
    );
    const json = (await response.json()) as {
      success: true;
      data: { user: { username: string } };
    };

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("http://127.0.0.1:4000/api/v1/users/me");
    expect((init.headers as Headers).get("authorization")).toBe(
      "Bearer mock-verified-complete",
    );
    expect(json.data.user.username).toBe("alya");
  });

  it("supplies an Idempotency-Key for POST when the client omitted it", async () => {
    vi.stubEnv("EXPRESS_ORIGIN", "http://127.0.0.1:4000");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await proxyToExpress(
      new Request("http://localhost/api/v1/join-requests/j1/review", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: "dolan_session=mock-verified-complete",
        },
        body: JSON.stringify({ decision: "accept" }),
      }),
      "/api/v1/join-requests/j1/review",
    );

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const key = new Headers(init.headers).get("idempotency-key");
    expect(key).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it("returns PROVIDER_UNAVAILABLE when fetch throws", async () => {
    vi.stubEnv("EXPRESS_ORIGIN", "http://127.0.0.1:4000");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const response = await proxyToExpress(
      new Request("http://localhost/api/v1/users/me"),
      "/api/v1/users/me",
    );
    expect(response.status).toBe(503);
  });

  it("forwards content-disposition from a successful upstream", async () => {
    vi.stubEnv("EXPRESS_ORIGIN", "http://127.0.0.1:4000");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("pdf", {
          status: 200,
          headers: {
            "content-type": "application/pdf",
            "content-disposition": "attachment; filename=trip.pdf",
          },
        }),
      ),
    );
    const response = await proxyToExpress(
      new Request("http://localhost/api/v1/trips/t1/itinerary.pdf"),
      "/api/v1/trips/t1/itinerary.pdf",
    );
    expect(response.headers.get("content-disposition")).toContain("trip.pdf");
  });
});
