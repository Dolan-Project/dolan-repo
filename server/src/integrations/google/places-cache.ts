import { logger } from "../../lib/logger.ts";
import { getRedisClient } from "../../lib/redis.ts";

export const PLACES_CACHE_PREFIX = "dolan:places:v1:";

export interface PlacesCache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSec: number): Promise<void>;
}

export class MemoryPlacesCache implements PlacesCache {
  private readonly entries = new Map<string, { value: unknown; expiresAt: number }>();

  constructor(private readonly now: () => number = Date.now) {}

  async get<T>(key: string): Promise<T | null> {
    const entry = this.entries.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= this.now()) {
      this.entries.delete(key);
      return null;
    }
    return structuredClone(entry.value) as T;
  }

  async set<T>(key: string, value: T, ttlSec: number): Promise<void> {
    this.entries.set(key, {
      value: structuredClone(value),
      expiresAt: this.now() + Math.max(1, ttlSec) * 1000,
    });
  }
}

export class RedisPlacesCache implements PlacesCache {
  constructor(private readonly fallback: PlacesCache = new MemoryPlacesCache()) {}

  async get<T>(key: string): Promise<T | null> {
    const redis = await getRedisClient();
    if (!redis) return this.fallback.get<T>(key);
    try {
      const raw = await redis.get(key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch (error) {
      logger.warn("Places Redis get failed", { error: String(error) });
      return this.fallback.get<T>(key);
    }
  }

  async set<T>(key: string, value: T, ttlSec: number): Promise<void> {
    const redis = await getRedisClient();
    if (!redis) {
      await this.fallback.set(key, value, ttlSec);
      return;
    }
    try {
      await redis.set(key, JSON.stringify(value), { EX: Math.max(1, ttlSec) });
    } catch (error) {
      logger.warn("Places Redis set failed", { error: String(error) });
      await this.fallback.set(key, value, ttlSec);
    }
  }
}

let sharedPlacesCache: PlacesCache | undefined;

export function getSharedPlacesCache(): PlacesCache {
  sharedPlacesCache ??= new RedisPlacesCache();
  return sharedPlacesCache;
}

export function createMemoryPlacesCache(): MemoryPlacesCache {
  return new MemoryPlacesCache();
}
