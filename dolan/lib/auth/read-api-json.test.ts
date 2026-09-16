import { describe, expect, it } from "vitest";
import { readApiJson } from "./read-api-json";

describe("readApiJson", () => {
  it("parses a JSON API payload", async () => {
    const response = new Response(JSON.stringify({ success: true, data: [] }), {
      headers: { "content-type": "application/json" },
    });
    await expect(readApiJson(response)).resolves.toEqual({ success: true, data: [] });
  });

  it("rejects an HTML 404 page instead of throwing a raw JSON parse error", async () => {
    const response = new Response("<!DOCTYPE html><html><body>Not found</body></html>", {
      status: 404,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
    await expect(readApiJson(response)).rejects.toThrow(/tidak tersedia/i);
  });

  it("rejects an empty body", async () => {
    const response = new Response("   ", {
      headers: { "content-type": "application/json" },
    });
    await expect(readApiJson(response)).rejects.toThrow(/tidak tersedia/i);
  });

  it("rejects HTML even when content-type is missing", async () => {
    const response = new Response("<html>oops</html>");
    await expect(readApiJson(response)).rejects.toThrow(/tidak tersedia/i);
  });

  it("rejects invalid JSON text", async () => {
    const response = new Response("{not-json", {
      headers: { "content-type": "application/json" },
    });
    await expect(readApiJson(response)).rejects.toThrow(/tidak tersedia/i);
  });
});

