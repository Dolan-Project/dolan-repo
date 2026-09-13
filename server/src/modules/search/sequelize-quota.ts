import { Op } from "sequelize";
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
    estimatedCost?: number;
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

    const sequelize = ApiUsageCounter.sequelize;
    if (!sequelize) {
      throw new Error("Sequelize is not initialized");
    }

    const cost = Number(input.estimatedCost ?? 0);
    const [affected] = await ApiUsageCounter.update(
      {
        requestCount: sequelize.literal("request_count + 1") as unknown as number,
        estimatedCost: sequelize.literal(`estimated_cost + ${cost}`) as unknown as string,
      },
      {
        where: {
          id: row.id,
          requestCount: { [Op.lt]: input.limit },
        },
      },
    );

    if (affected === 0) {
      throw tooManyRequests(SearchErrorCode.QUOTA_EXCEEDED, "Daily Places quota exceeded");
    }

    await row.reload();
    return row.requestCount;
  }
}
