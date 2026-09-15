const INSTAGRAM_HANDLE = /^[A-Za-z0-9._]{1,30}$/;
const TIKTOK_HANDLE = /^[A-Za-z0-9._]{2,24}$/;

function stripUrlNoise(value: string): string {
  return value.trim().replace(/^@/, "").replace(/\/+$/, "");
}

export function instagramProfileUrl(input: string): string | null {
  const raw = stripUrlNoise(input);
  if (!raw) return null;
  const withoutHost = raw
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/^instagram\.com\//i, "");
  const handle = stripUrlNoise(withoutHost.split(/[/?#]/)[0] ?? "");
  if (!INSTAGRAM_HANDLE.test(handle)) return null;
  return `https://www.instagram.com/${handle}`;
}

export function tiktokProfileUrl(input: string): string | null {
  const raw = stripUrlNoise(input);
  if (!raw) return null;
  const withoutHost = raw
    .replace(/^https?:\/\/(www\.)?tiktok\.com\/@?/i, "")
    .replace(/^tiktok\.com\/@?/i, "");
  const handle = stripUrlNoise(withoutHost.split(/[/?#]/)[0] ?? "");
  if (!TIKTOK_HANDLE.test(handle)) return null;
  return `https://www.tiktok.com/@${handle}`;
}

export function socialHandleFromUrl(url: string | null | undefined): string {
  if (!url) return "";
  try {
    const path = new URL(url).pathname.replace(/^\/@?/, "").replace(/\/+$/, "");
    return path.split("/")[0] ?? "";
  } catch {
    return "";
  }
}
