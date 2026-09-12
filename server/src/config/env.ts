function readList(value: string | undefined, fallback: string[]): string[] {
  if (!value) return fallback;
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  webUrl: process.env.WEB_URL ?? "http://localhost:3000",
  corsOrigins: readList(process.env.CORS_ALLOWED_ORIGINS, ["http://localhost:3000"]),
  socketPath: process.env.SOCKET_PATH ?? "/socket.io",
  authAdapter: (process.env.AUTH_ADAPTER ?? "mock") as "mock" | "supabase",
  supabaseUrl: process.env.SUPABASE_URL ?? "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  supabaseCookiePrefix: process.env.SUPABASE_COOKIE_PREFIX ?? "sb-",
  logLevel: process.env.LOG_LEVEL ?? "info",
};

export function isProduction(): boolean {
  return env.nodeEnv === "production";
}
