import { SearchErrorCode } from "@dolan/shared";
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
    });
    if (count > operationLimit) {
      throw tooManyRequests(SearchErrorCode.QUOTA_EXCEEDED, "Daily Places quota exceeded");
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
  }): Promise<number> {
    const key = `${input.provider}:${input.operation}:${input.period}:${input.userId ?? "guest"}`;
    const next = (this.counts.get(key) ?? 0) + 1;
    this.counts.set(key, next);
    return next;
  }
}
