import { SearchErrorCode } from "@dolan/shared";
import { ApiUsageCounter } from "@dolan/database";
import { tooManyRequests } from "../../lib/api-error.ts";
import type { QuotaStore } from "./types.ts";

export class SequelizeQuotaStore implements QuotaStore {
  async countAndIncrement(input: {
    provider: string;
    operation: string;
    period: string;
    userId: string | null;
    limit: number;
  }): Promise<number> {
    const [row] = await ApiUsageCounter.findOrCreate({
      where: {
        provider: input.provider,
        operation: input.operation,
        period: input.period,
        userId: input.userId,
      },
      defaults: {
        provider: input.provider,
        operation: input.operation,
        period: input.period,
        userId: input.userId,
        requestCount: 0,
        estimatedCost: "0",
      },
    });

    if (row.requestCount >= input.limit) {
      throw tooManyRequests(SearchErrorCode.QUOTA_EXCEEDED, "Daily Places quota exceeded");
    }

    await row.increment("requestCount");
    await row.reload();
    return row.requestCount;
  }
}
