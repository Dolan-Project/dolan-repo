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

  async consumePlaces(_userId: string | null, _operation: string) {
    // Per-user Google Places quota is disabled. Cache still avoids repeat calls.
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

  async consumeRoutes(_userId: string | null) {
    // Per-user Google Routes quota is disabled.
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
