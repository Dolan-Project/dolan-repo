import { parse as parseCookie } from "cookie";

/** Reads the Express local session cookie (`dolan_session`). */
export function extractAccessTokenFromCookies(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) return null;
  const cookies = parseCookie(cookieHeader);
  return cookies.dolan_session ?? null;
}
