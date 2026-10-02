import { convertToBase } from "./portfolio-summary";

export interface HistoryRow {
  holding_id: string;
  as_of: string; // YYYY-MM-DD
  value: number;
  created_at: string;
}

export interface BlendedHistoryPoint {
  date: string; // YYYY-MM-DD
  value: number; // base-currency total across all convertible holdings
}

const toPaisa = (n: number) => Math.round(n * 100);
const fromPaisa = (p: number) => p / 100;

/**
 * Whole-portfolio value over time, blended into one base currency.
 *
 * Each holding only has value-history rows for the dates it was actually
 * updated on — summing just the rows present on a given date would make the
 * total jump erratically whenever one holding happens to get a new entry
 * while the others are stale. Instead, every holding's most recent known
 * value is carried forward to every date in the union of all holdings'
 * dates, the same way a portfolio's total value doesn't reset to zero just
 * because you haven't logged an update for one asset today.
 *
 * A holding is excluded from dates before its first recorded point (it
 * didn't exist in the portfolio yet) and from any date where its currency
 * has no rate in `rates` (mirrors blendedTotals in portfolio-summary.ts,
 * which does the same for the current-snapshot cards).
 *
 * Known simplification: `rates` is a single flat map (today's manually
 * entered rate), applied retroactively to every historical point — there's
 * no historical FX-rate tracking in the data model. Matches the existing
 * single-snapshot-rate UX everywhere else in the app.
 */
export function blendHistoryOverTime(
  rows: HistoryRow[],
  holdingCurrencies: Record<string, string>,
  rates: Record<string, number>,
  baseCurrency = "PKR",
): BlendedHistoryPoint[] {
  // Collapse each holding's rows to one point per day (latest by created_at),
  // same rule as collapseHistoryByDay, sorted oldest-first per holding.
  const byHolding = new Map<string, Map<string, HistoryRow>>();
  for (const r of rows) {
    let byDay = byHolding.get(r.holding_id);
    if (!byDay) {
      byDay = new Map();
      byHolding.set(r.holding_id, byDay);
    }
    const existing = byDay.get(r.as_of);
    if (!existing || r.created_at > existing.created_at) {
      byDay.set(r.as_of, r);
    }
  }

  const sortedPointsByHolding = new Map<string, { date: string; value: number }[]>();
  const allDates = new Set<string>();
  for (const [holdingId, byDay] of byHolding) {
    const points = [...byDay.values()]
      .map((r) => ({ date: r.as_of, value: r.value }))
      .sort((a, b) => a.date.localeCompare(b.date));
    sortedPointsByHolding.set(holdingId, points);
    for (const p of points) allDates.add(p.date);
  }

  const dates = [...allDates].sort();

  // One pointer per holding into its sorted points, advanced as `dates`
  // moves forward — O(total points) rather than re-scanning per date.
  const pointerByHolding = new Map<string, number>();
  const currentValueByHolding = new Map<string, number>();

  const result: BlendedHistoryPoint[] = [];

  for (const date of dates) {
    for (const [holdingId, points] of sortedPointsByHolding) {
      let idx = pointerByHolding.get(holdingId) ?? 0;
      while (idx < points.length && points[idx].date <= date) {
        currentValueByHolding.set(holdingId, points[idx].value);
        idx++;
      }
      pointerByHolding.set(holdingId, idx);
    }

    let totalP = 0;
    for (const [holdingId, value] of currentValueByHolding) {
      const currency = holdingCurrencies[holdingId] ?? baseCurrency;
      const converted = convertToBase(value, currency, rates, baseCurrency);
      if (converted == null) continue;
      totalP += toPaisa(converted);
    }
    result.push({ date, value: fromPaisa(totalP) });
  }

  return result;
}
