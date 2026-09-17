const HTML_UNAVAILABLE = "Layanan trip sedang tidak tersedia. Muat ulang halaman, lalu coba lagi.";

export async function readApiJson<T = unknown>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  const text = await response.text();
  if (!text.trim()) {
    throw new Error(HTML_UNAVAILABLE);
  }
  const looksHtml = contentType.includes("text/html") || /^\s*</.test(text);
  if (looksHtml && !contentType.includes("json")) {
    throw new Error(HTML_UNAVAILABLE);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(HTML_UNAVAILABLE);
  }
}
