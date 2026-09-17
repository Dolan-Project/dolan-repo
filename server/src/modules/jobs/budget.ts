import {
  type BudgetBasis,
  type BudgetItem,
  type BudgetItemInput,
  type BudgetSummary,
} from "@dolan/shared";

const SCALE = 100n;

export function parseMoney(value: string): bigint {
  const [whole, fraction = ""] = value.split(".");
  const padded = (fraction + "00").slice(0, 2);
  return BigInt(whole) * SCALE + BigInt(padded);
}

export function formatMoney(amount: bigint): string {
  const negative = amount < 0n;
  const absolute = negative ? -amount : amount;
  const whole = absolute / SCALE;
  const fraction = (absolute % SCALE).toString().padStart(2, "0");
  return `${negative ? "-" : ""}${whole.toString()}.${fraction}`;
}

export function lineSubtotals(item: BudgetItemInput): { subtotalLow: string; subtotalHigh: string } {
  const quantity = parseMoney(item.quantity);
  const low = parseMoney(item.unitCostLow);
  const high = parseMoney(item.unitCostHigh);
  if (low > high) {
    throw new Error("unitCostLow cannot exceed unitCostHigh");
  }
  return {
    subtotalLow: formatMoney((quantity * low) / SCALE),
    subtotalHigh: formatMoney((quantity * high) / SCALE),
  };
}

export function buildBudgetSummary(
  items: BudgetItemInput[],
  basis: BudgetBasis = "PER_PERSON",
): BudgetSummary {
  const computed: BudgetItem[] = items.map((item) => {
    const subtotals = lineSubtotals(item);
    return {
      ...item,
      id: crypto.randomUUID(),
      sourceReference: item.sourceReference ?? null,
      notes: item.notes ?? null,
      checkedAt: null,
      subtotalLow: subtotals.subtotalLow,
      subtotalHigh: subtotals.subtotalHigh,
    };
  });

  const totalLow = computed.reduce((sum, item) => sum + parseMoney(item.subtotalLow), 0n);
  const totalHigh = computed.reduce((sum, item) => sum + parseMoney(item.subtotalHigh), 0n);

  return {
    currency: "IDR",
    basis,
    totalLow: formatMoney(totalLow),
    totalHigh: formatMoney(totalHigh),
    items: computed,
  };
}
