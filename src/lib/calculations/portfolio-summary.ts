// Portfolio-level aggregations for a value-tracked portfolio. All paisa-safe.
//
// Currency is the thing that's easy to get wrong: you can't add PKR to USD
// without a rate. So summarizeByCurrency never converts (it's always honest),
// and the blend/allocation helpers convert only when given rates, flagging any
// currency they couldn't convert rather than fabricating a number.

export interface HoldingForSummary {
  currency: string;
  original_investment: number;
  current_value: number;
  asset_class_id: string;
}

const toPaisa = (n: number) => Math.round(n * 100);
const fromPaisa = (p: number) => p / 100;
const percentOf = (profitPaisa: number, investedPaisa: number) =>
  investedPaisa === 0 ? 0 : (profitPaisa / investedPaisa) * 100;

export interface CurrencyTotal {
  currency: string;
  invested: number;
  currentValue: number;
  profit: number;
  profitPercent: number;
}

/** Per-currency subtotals. No conversion — each currency stands on its own. */
export function summarizeByCurrency(
  holdings: HoldingForSummary[],
): CurrencyTotal[] {
  const map = new Map<string, { investedP: number; currentP: number }>();
  for (const h of holdings) {
    const acc = map.get(h.currency) ?? { investedP: 0, currentP: 0 };
    acc.investedP += toPaisa(h.original_investment);
    acc.currentP += toPaisa(h.current_value);
    map.set(h.currency, acc);
  }

  const totals: CurrencyTotal[] = [];
  for (const [currency, { investedP, currentP }] of map) {
    const profitP = currentP - investedP;
    totals.push({
      currency,
      invested: fromPaisa(investedP),
      currentValue: fromPaisa(currentP),
      profit: fromPaisa(profitP),
      profitPercent: percentOf(profitP, investedP),
    });
  }
  // Biggest holdings first; stable tie-break by currency.
  totals.sort(
    (a, b) => b.currentValue - a.currentValue || a.currency.localeCompare(b.currency),
  );
  return totals;
}

/**
 * Convert a value to the base currency. Returns null if it's a foreign currency
 * with no rate supplied — the caller decides what to do with that.
 * `rates` maps a currency to how many base units one of it is worth (e.g.
 * { USD: 280 } means 1 USD = 280 PKR).
 */
export function convertToBase(
  value: number,
  currency: string,
  rates: Record<string, number>,
  baseCurrency = "PKR",
): number | null {
  if (currency === baseCurrency) return value;
  const rate = rates[currency];
  if (rate == null) return null;
  return value * rate;
}

export interface BlendedTotals {
  invested: number;
  currentValue: number;
  profit: number;
  profitPercent: number;
  unconvertedCurrencies: string[];
}

/** One combined total in the base currency, blending via the supplied rates. */
export function blendedTotals(
  holdings: HoldingForSummary[],
  rates: Record<string, number>,
  baseCurrency = "PKR",
): BlendedTotals {
  let investedP = 0;
  let currentP = 0;
  const unconverted = new Set<string>();

  for (const h of holdings) {
    const inv = convertToBase(h.original_investment, h.currency, rates, baseCurrency);
    const cur = convertToBase(h.current_value, h.currency, rates, baseCurrency);
    if (inv == null || cur == null) {
      unconverted.add(h.currency);
      continue;
    }
    investedP += toPaisa(inv);
    currentP += toPaisa(cur);
  }

  const profitP = currentP - investedP;
  return {
    invested: fromPaisa(investedP),
    currentValue: fromPaisa(currentP),
    profit: fromPaisa(profitP),
    profitPercent: percentOf(profitP, investedP),
    unconvertedCurrencies: [...unconverted].sort(),
  };
}

export interface AssetClassAllocation {
  assetClassId: string;
  value: number; // base-currency current value
  percent: number; // share of total convertible current value
}

/** Share of current value per asset class, in the base currency. */
export function allocationByAssetClass(
  holdings: HoldingForSummary[],
  rates: Record<string, number>,
  baseCurrency = "PKR",
): AssetClassAllocation[] {
  const map = new Map<string, number>(); // assetClassId -> paisa
  let totalP = 0;

  for (const h of holdings) {
    const cur = convertToBase(h.current_value, h.currency, rates, baseCurrency);
    if (cur == null) continue; // can't place it without a rate
    const p = toPaisa(cur);
    map.set(h.asset_class_id, (map.get(h.asset_class_id) ?? 0) + p);
    totalP += p;
  }

  const out: AssetClassAllocation[] = [];
  for (const [assetClassId, p] of map) {
    out.push({
      assetClassId,
      value: fromPaisa(p),
      percent: totalP === 0 ? 0 : (p / totalP) * 100,
    });
  }
  out.sort(
    (a, b) => b.value - a.value || a.assetClassId.localeCompare(b.assetClassId),
  );
  return out;
}