import { AsyncLocalStorage } from "node:async_hooks";
import type { PlacesCacheMissHandler } from "../../integrations/google/caching-places-client.ts";
import type { QuotaService } from "./quota.ts";

type PlacesQuotaStore = { userId: string | null };

const storage = new AsyncLocalStorage<PlacesQuotaStore>();

export function runWithPlacesQuotaUser<T>(userId: string | null, fn: () => Promise<T>): Promise<T> {
  return storage.run({ userId }, fn);
}

export function createPlacesQuotaMissHandler(quota: QuotaService): PlacesCacheMissHandler {
  return async (operation) => {
    const ctx = storage.getStore();
    if (!ctx) return;
    await quota.consumePlaces(ctx.userId, operation);
  };
}
