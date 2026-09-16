import { createClient } from "redis";
import { env } from "../config/env.ts";
import { logger } from "./logger.ts";

type RedisClient = ReturnType<typeof createClient>;

let client: RedisClient | null = null;
let connectPromise: Promise<RedisClient | null> | null = null;
let loggedConnectFailure = false;

export async function getRedisClient(): Promise<RedisClient | null> {
  const url = env.redisUrl;
  if (!url) return null;
  if (client?.isOpen) return client;
  if (connectPromise) return connectPromise;

  connectPromise = connect(url);
  return connectPromise;
}

async function connect(url: string): Promise<RedisClient | null> {
  try {
    const next = createClient({ url });
    next.on("error", (error) => {
      logger.warn("Redis client error", { error: String(error) });
    });
    await next.connect();
    client = next;
    return client;
  } catch (error) {
    if (!loggedConnectFailure) {
      loggedConnectFailure = true;
      logger.warn("Redis unavailable; Places cache falling back to in-memory", {
        error: String(error),
      });
    }
    connectPromise = null;
    return null;
  }
}
