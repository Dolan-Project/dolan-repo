export const SESSION_COOKIE = "dolan_session";

export function sessionCookieHeader(value: string | null): string {
  if (value === null) {
    return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
  }
  return `${SESSION_COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax`;
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
