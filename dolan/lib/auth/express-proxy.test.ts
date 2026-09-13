import { afterEach, describe, expect, it, vi } from "vitest";
import { extractAccessToken, proxyToExpress } from "./express-proxy";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("extractAccessToken", () => {
  it("reads a Bearer header first", () => {
    const request = new Request("http://localhost/api/v1/trips", {
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
});

describe("proxyToExpress", () => {
  it("returns 503 when EXPRESS_ORIGIN is missing", async () => {
    vi.stubEnv("EXPRESS_ORIGIN", "");
    const response = await proxyToExpress(
      new Request("http://localhost/api/v1/trips"),
      "/api/v1/trips",
    );
    expect(response.status).toBe(503);
  });
});
