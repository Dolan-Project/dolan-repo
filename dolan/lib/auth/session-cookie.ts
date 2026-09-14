export const SESSION_COOKIE = "dolan_session";

function cookieFlags(maxAge?: number): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  const age = typeof maxAge === "number" ? `; Max-Age=${maxAge}` : "";
  return `Path=/; HttpOnly; SameSite=Lax${secure}${age}`;
}

export function sessionCookieHeader(value: string | null): string {
  if (value === null) {
    return `${SESSION_COOKIE}=; ${cookieFlags(0)}`;
  }
  return `${SESSION_COOKIE}=${encodeURIComponent(value)}; ${cookieFlags()}`;
}

export function readSessionId(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq);
    const value = trimmed.slice(eq + 1);
    if (key === SESSION_COOKIE) {
      return decodeURIComponent(value) || null;
    }
  }
  return null;
}
