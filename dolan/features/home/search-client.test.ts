import { afterEach, describe, expect, it, vi } from "vitest";
import { apiSearchAdapter } from "./search-client";

const query = { city: "Yogyakarta", budget: "hemat" as const, filters: [] };

describe("home live search adapter", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns a provider error when an upstream request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => new Response(JSON.stringify({
      success: false,
      error: { code: "PROVIDER_UNAVAILABLE", message: "Google Places sedang tidak tersedia", requestId: "test" },
    }), { status: 503, headers: { "content-type": "application/json" } })));

    await expect(apiSearchAdapter.search(query)).rejects.toMatchObject({
      code: "PROVIDER",
      message: "Google Places sedang tidak tersedia",
    });
  });

  it("aborts an older search so its response cannot replace a newer request", async () => {
    const request = vi.fn((_url: string, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true });
    }));
    vi.stubGlobal("fetch", request);
    const controller = new AbortController();
    const staleSearch = apiSearchAdapter.search(query, controller.signal);
    controller.abort();

    await expect(staleSearch).rejects.toMatchObject({ name: "AbortError" });
    expect(request).toHaveBeenCalled();
  });
});
