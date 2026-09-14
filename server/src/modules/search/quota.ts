import { SearchErrorCode } from "@dolan/shared";
import { env } from "../../config/env.ts";
import { tooManyRequests } from "../../lib/api-error.ts";
import type { QuotaStore } from "./types.ts";

export class QuotaService {
  constructor(
    private readonly store: QuotaStore,
    private readonly dailyLimit: number,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async consumePlaces(userId: string | null, operation: string) {
    const period = this.now().toISOString().slice(0, 10);
    // A single Places search renders several result photos. Giving photo media
    // the same allowance as searches made the Explore cards lose their images
    // after only a few searches, especially because guests share one bucket.
    const operationLimit = operation === "getPhotoMedia" ? this.dailyLimit * 10 : this.dailyLimit;
    const count = await this.store.countAndIncrement({
      provider: "google_places",
      operation,
      period,
      userId,
      limit: operationLimit,
      estimatedCost: env.placesEstimatedCostPerRequest,
    });
    if (count > operationLimit) {
      throw tooManyRequests(SearchErrorCode.QUOTA_EXCEEDED, "Daily Places quota exceeded");
    }
  }

  async consumeAi(userId: string) {
    const period = this.now().toISOString().slice(0, 10);
    const limit = env.aiMaxRegeneratePerUserPerDay;
    const count = await this.store.countAndIncrement({
      provider: "ai",
      operation: "generate",
      period,
      userId,
      limit,
    });
    if (count > limit) {
      throw tooManyRequests(SearchErrorCode.QUOTA_EXCEEDED, "Daily AI generation quota exceeded");
    }
  }

  async consumeRoutes(userId: string | null) {
    const period = this.now().toISOString().slice(0, 10);
    const limit = this.dailyLimit;
    const count = await this.store.countAndIncrement({
      provider: "google_routes",
      operation: "computeRoutes",
      period,
      userId,
      limit,
      estimatedCost: env.placesEstimatedCostPerRequest,
    });
    if (count > limit) {
      throw tooManyRequests(SearchErrorCode.QUOTA_EXCEEDED, "Daily Routes quota exceeded");
    }
  }
}

export class MemoryQuotaStore implements QuotaStore {
  readonly counts = new Map<string, number>();

  async countAndIncrement(input: {
    provider: string;
    operation: string;
    period: string;
    userId: string | null;
    limit: number;
    estimatedCost?: number;
  }): Promise<number> {
    const key = `${input.provider}:${input.operation}:${input.period}:${input.userId ?? "guest"}`;
    const next = (this.counts.get(key) ?? 0) + 1;
    this.counts.set(key, next);
    return next;
  }
}
