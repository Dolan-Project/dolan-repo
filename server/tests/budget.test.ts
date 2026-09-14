import { describe, expect, it } from "vitest";
import { buildBudgetSummary, formatMoney, parseMoney } from "../src/modules/jobs/budget.ts";

describe("server-calculated budget", () => {
  it("multiplies quantity and unit cost without trusting AI totals", () => {
    const summary = buildBudgetSummary([
      {
        category: "FOOD",
        label: "Makan siang",
        quantity: "2.00",
        unit: "porsi",
        unitCostLow: "30000.00",
        unitCostHigh: "45000.00",
        sourceType: "estimate",
      },
      {
        category: "TRANSPORT_LOCAL",
        label: "Ojek",
        quantity: "1.00",
        unit: "trip",
        unitCostLow: "20000.00",
        unitCostHigh: "25000.00",
        sourceType: "estimate",
      },
    ]);

    expect(summary.totalLow).toBe("80000.00");
    expect(summary.totalHigh).toBe("115000.00");
    expect(summary.items[0]?.subtotalLow).toBe("60000.00");
  });

  it("keeps money math exact for two decimal places", () => {
    expect(formatMoney(parseMoney("10.50") + parseMoney("0.25"))).toBe("10.75");
  });
});
