export const LOGIN_PAGE_PATH = "/masuk";
export const DEFAULT_POST_AUTH_PATH = "/";
export const DEFAULT_POST_LOGOUT_PATH = "/";
export const SAFE_DRAFT_STORAGE_KEY = "dolan.safeDraft";

const EXACT_ALLOWED = new Set([
  "/",
  "/buat-trip",
  "/profil",
  "/trip-saya",
  "/jelajah",
]);

export function isAllowedNextPath(next: string): boolean {
  if (!next.startsWith("/")) return false;
  if (next.includes("//")) return false;
  const lower = next.toLowerCase();
  if (lower.startsWith("javascript:")) return false;
  if (EXACT_ALLOWED.has(next)) return true;
  if (next.startsWith("/wisata/")) return true;
  if (next.startsWith("/trip/") && !next.startsWith("/trip-saya")) return true;
  return false;
}

export function resolvePostAuthPath(
  next: string | undefined | null,
): string {
  if (!next) return DEFAULT_POST_AUTH_PATH;
  return isAllowedNextPath(next) ? next : DEFAULT_POST_AUTH_PATH;
}
