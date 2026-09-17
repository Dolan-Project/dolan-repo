import { jsonResult, statusForCode } from "./api-response";
import { readSessionId } from "./session-cookie";
import { createApiError } from "@/mocks/scenarios";

export function extractAccessToken(request: Request): string | null {
  const bearer = request.headers.get("authorization");
  if (bearer?.startsWith("Bearer ")) {
    const token = bearer.slice("Bearer ".length).trim();
    if (token) return token;
  }
  try {
    return readSessionId(request.headers.get("cookie"));
  } catch {
    return null;
  }
}

export async function proxyToExpress(
  request: Request,
  path: string,
  options?: { method?: string; json?: unknown },
): Promise<Response> {
  const origin = process.env.EXPRESS_ORIGIN?.trim();
  if (!origin) {
    return jsonResult(
      createApiError("PROVIDER_UNAVAILABLE", "Layanan tidak tersedia"),
      statusForCode("PROVIDER_UNAVAILABLE"),
    );
  }

  const headers = new Headers();
  const token = extractAccessToken(request);
  if (token) headers.set("authorization", `Bearer ${token}`);
  const cookie = request.headers.get("cookie");
  if (cookie) headers.set("cookie", cookie);
  const method = (options?.method ?? request.method).toUpperCase();
  const mutating = method !== "GET" && method !== "HEAD";
  const idempotencyKey = request.headers.get("idempotency-key")
    ?? (mutating ? crypto.randomUUID() : null);
  if (idempotencyKey) headers.set("idempotency-key", idempotencyKey);
  let body: BodyInit | undefined;
  if (options?.json !== undefined) {
    headers.set("content-type", "application/json");
    body = JSON.stringify(options.json);
  } else if (method !== "GET" && method !== "HEAD") {
    const contentType = request.headers.get("content-type");
    if (contentType) headers.set("content-type", contentType);
    body = await request.arrayBuffer();
  }

  const url = new URL(path, `${origin.replace(/\/$/, "")}/`);
  const incoming = new URL(request.url);
  url.search = incoming.search;

  try {
    const upstream = await fetch(url.toString(), { method, headers, body });
    const responseHeaders: Record<string, string> = {
      "content-type":
        upstream.headers.get("content-type") ?? "application/json",
    };
    const disposition = upstream.headers.get("content-disposition");
    if (disposition) responseHeaders["content-disposition"] = disposition;
    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch {
    return jsonResult(
      createApiError("PROVIDER_UNAVAILABLE", "Layanan tidak tersedia"),
      statusForCode("PROVIDER_UNAVAILABLE"),
    );
  }
}
