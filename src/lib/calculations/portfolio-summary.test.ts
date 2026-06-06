import {
  summarizeByCurrency,
  convertToBase,
  blendedTotals,
  allocationByAssetClass,
  type HoldingForSummary,
} from "./portfolio-summary";

const h = (
  currency: string,
  original_investment: number,
  current_value: number,
  asset_class_id: string,
): HoldingForSummary => ({
  currency,
  original_investment,
  current_value,
  asset_class_id,
});

describe("summarizeByCurrency", () => {
  it("returns nothing for no holdings", () => {
    expect(summarizeByCurrency([])).toEqual([]);
  });

  it("sums invested, value, and profit within a currency", () => {
    const [pkr] = summarizeByCurrency([
      h("PKR", 25000, 30000, "a1"),
      h("PKR", 10000, 9000, "a2"),
    ]);
    expect(pkr.invested).toBe(35000);
    expect(pkr.currentValue).toBe(39000);
    expect(pkr.profit).toBe(4000);
    expect(pkr.profitPercent).toBeCloseTo(11.43, 2);
  });

  it("keeps currencies separate, biggest value first", () => {
    const totals = summarizeByCurrency([
      h("USD", 100, 120, "a2"),
      h("PKR", 1000, 1500, "a1"),
    ]);
    expect(totals.map((t) => t.currency)).toEqual(["PKR", "USD"]);
  });

  it("stays float-safe", () => {
    const [pkr] = summarizeByCurrency([
      h("PKR", 0.1, 0.2, "a1"),
      h("PKR", 0.2, 0.1, "a1"),
    ]);
    expect(pkr.invested).toBe(0.3);
    expect(pkr.currentValue).toBe(0.3);
    expect(pkr.profit).toBe(0);
  });

  it("does not divide by zero with no investment", () => {
    const [pkr] = summarizeByCurrency([h("PKR", 0, 100, "a1")]);
    expect(pkr.profitPercent).toBe(0);
  });
});

describe("convertToBase", () => {
  it("returns the value unchanged for the base currency", () => {
    expect(convertToBase(1000, "PKR", {})).toBe(1000);
  });

  it("applies the rate for a foreign currency", () => {
    expect(convertToBase(100, "USD", { USD: 280 })).toBe(28000);
  });

  it("returns null when no rate is supplied", () => {
    expect(convertToBase(100, "USD", {})).toBeNull();
  });
});

describe("blendedTotals", () => {
  it("blends currencies using the supplied rates", () => {
    const result = blendedTotals(
      [h("PKR", 1000, 1500, "a1"), h("USD", 100, 120, "a2")],
      { USD: 280 },
    );
    expect(result.invested).toBe(29000);
    expect(result.currentValue).toBe(35100);
    expect(result.profit).toBe(6100);
    expect(result.profitPercent).toBeCloseTo(21.03, 2);
    expect(result.unconvertedCurrencies).toEqual([]);
  });

  it("flags currencies it couldn't convert and leaves them out", () => {
    const result = blendedTotals(
      [h("PKR", 1000, 1500, "a1"), h("USD", 100, 120, "a2")],
      {},
    );
    expect(result.invested).toBe(1000);
    expect(result.currentValue).toBe(1500);
    expect(result.unconvertedCurrencies).toEqual(["USD"]);
  });

  it("is all zeros for no holdings", () => {
    expect(blendedTotals([], {})).toEqual({
      invested: 0,
      currentValue: 0,
      profit: 0,
      profitPercent: 0,
      unconvertedCurrencies: [],
    });
  });
});

describe("allocationByAssetClass", () => {
  it("computes each class's share, biggest first", () => {
    const alloc = allocationByAssetClass(
      [h("PKR", 0, 30000, "a1"), h("PKR", 0, 10000, "a2")],
      {},
    );
    expect(alloc).toEqual([
      { assetClassId: "a1", value: 30000, percent: 75 },
      { assetClassId: "a2", value: 10000, percent: 25 },
    ]);
  });

  it("converts to base before allocating", () => {
    const alloc = allocationByAssetClass(
      [h("PKR", 0, 1000, "a1"), h("USD", 0, 100, "a2")],
      { USD: 280 },
    );
    expect(alloc[0].assetClassId).toBe("a2"); // 28000 base > 1000
    expect(alloc[0].percent).toBeCloseTo(96.55, 2);
  });

  it("skips holdings it can't convert", () => {
    const alloc = allocationByAssetClass(
      [h("PKR", 0, 1000, "a1"), h("USD", 0, 100, "a2")],
      {},
    );
    expect(alloc).toEqual([{ assetClassId: "a1", value: 1000, percent: 100 }]);
  });

  it("returns nothing for no holdings", () => {
    expect(allocationByAssetClass([], {})).toEqual([]);
  });
});
