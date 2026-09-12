const SENSITIVE_KEYS = [
  "authorization",
  "cookie",
  "access_token",
  "refresh_token",
  "accessToken",
  "refreshToken",
  "token",
  "apikey",
  "service_role",
];

export function redactValue(value: unknown): unknown {
  if (typeof value === "string") {
    if (value.length > 24 && looksLikeSecret(value)) return "[redacted]";
    return value;
  }
  if (Array.isArray(value)) return value.map(redactValue);
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).map(([key, nested]) => {
      if (SENSITIVE_KEYS.some((item) => key.toLowerCase().includes(item))) {
        return [key, "[redacted]"];
      }
      return [key, redactValue(nested)];
    });
    return Object.fromEntries(entries);
  }
  return value;
}

function looksLikeSecret(value: string): boolean {
  return value.startsWith("eyJ") || value.startsWith("sbp_") || value.includes("Bearer ");
}

export function redactAuthorizationHeader(header: string | undefined): string | undefined {
  if (!header) return undefined;
  return header.startsWith("Bearer ") ? "Bearer [redacted]" : "[redacted]";
}
