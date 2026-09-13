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
      createApiError("PROVIDER_UNAVAILABLE", "Layanan trip tidak tersedia"),
      statusForCode("PROVIDER_UNAVAILABLE"),
    );
  }

  const headers = new Headers();
  const token = extractAccessToken(request);
  if (token) headers.set("authorization", `Bearer ${token}`);
  const cookie = request.headers.get("cookie");
  if (cookie) headers.set("cookie", cookie);
  const idempotencyKey = request.headers.get("idempotency-key");
  if (idempotencyKey) headers.set("idempotency-key", idempotencyKey);

  const method = (options?.method ?? request.method).toUpperCase();
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
    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        "content-type":
          upstream.headers.get("content-type") ?? "application/json",
      },
    });
  } catch {
    return jsonResult(
      createApiError("PROVIDER_UNAVAILABLE", "Layanan trip tidak tersedia"),
      statusForCode("PROVIDER_UNAVAILABLE"),
    );
  }
}
