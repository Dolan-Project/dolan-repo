import "./load-env.ts";

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
  googleMapsServerKey: process.env.GOOGLE_MAPS_SERVER_KEY ?? "",
  placesMaxRequestsPerUserPerDay: Number(process.env.PLACES_MAX_REQUESTS_PER_USER_PER_DAY ?? 50),
  placesEstimatedCostPerRequest: Number(process.env.PLACES_ESTIMATED_COST_PER_REQUEST ?? 0.01),
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000),
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX ?? 120),
  rateLimitSearchMax: Number(process.env.RATE_LIMIT_SEARCH_MAX ?? 40),
  logLevel: process.env.LOG_LEVEL ?? "info",
  workerId: process.env.WORKER_ID ?? "worker-1",
  jobPollIntervalMs: Number(process.env.JOB_POLL_INTERVAL_MS ?? 2000),
  jobLockTimeoutMs: Number(process.env.JOB_LOCK_TIMEOUT_MS ?? 300000),
  jobRetryBackoffMs: Number(process.env.JOB_RETRY_BACKOFF_MS ?? 2000),
  groqApiKey: process.env.GROQ_API_KEY ?? "",
  groqModel: process.env.GROQ_MODEL ?? "openai/gpt-oss-20b",
  imagekitPublicKey: process.env.IMAGEKIT_PUBLIC_KEY ?? "",
  imagekitPrivateKey: process.env.IMAGEKIT_PRIVATE_KEY ?? "",
  imagekitUrlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT ?? "",
  apiUrl: process.env.API_URL ?? "http://localhost:4000",
  locationStaleSeconds: Number(process.env.LOCATION_STALE_SECONDS ?? 120),
  locationHideSeconds: Number(process.env.LOCATION_HIDE_SECONDS ?? 600),
  shareTokenSecret: process.env.SHARE_TOKEN_SECRET ?? "dev-share-token-secret",
  shareLinkTtlHours: Number(process.env.SHARE_LINK_TTL_HOURS ?? 168),
};

export function isProduction(): boolean {
  return env.nodeEnv === "production";
}
