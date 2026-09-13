import { parse as parseCookie } from "cookie";

export function extractAccessTokenFromCookies(
  cookieHeader: string | undefined,
  cookiePrefix: string,
): string | null {
  if (!cookieHeader) return null;
  const cookies = parseCookie(cookieHeader);

  for (const [name, value] of Object.entries(cookies)) {
    if (!value || !name.startsWith(cookiePrefix) || !name.includes("auth-token")) {
      continue;
    }
    const token = readSupabaseCookieValue(value);
    if (token) return token;
  }

  return cookies["sb-access-token"] ?? null;
}

function readSupabaseCookieValue(raw: string): string | null {
  try {
    const decoded = decodeCookiePayload(raw);
    const parsed = JSON.parse(decoded) as { access_token?: string };
    return parsed.access_token ?? null;
  } catch {
    return raw.startsWith("eyJ") ? raw : null;
  }
}

function decodeCookiePayload(raw: string): string {
  const normalized = raw.startsWith("base64-") ? raw.slice("base64-".length) : raw;
  try {
    return Buffer.from(normalized, "base64").toString("utf8");
  } catch {
    return raw;
  }
}
