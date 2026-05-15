import { addMonths, type YearMonth } from "@/lib/format/year-month";
import type { MonthlyTotal } from "./aggregate-by-month";

/**
 * Produces a contiguous month-by-month series between `from` and `to`
 * (inclusive), filling missing months with total: 0.
 *
 * Used by the trends chart so the X axis is a continuous time axis with
 * visible "I spent nothing in March" dips, rather than collapsing March
 * out of existence.
 *
 * Input months outside [from, to] are silently dropped. Inputs are not
 * required to be sorted; we look them up by key.
 */
export function fillMonthGaps(
  sparse: MonthlyTotal[],
  from: YearMonth,
  to: YearMonth,
): MonthlyTotal[] {
  const lookup = new Map(sparse.map((r) => [r.yearMonth, r.total]));
  const result: MonthlyTotal[] = [];

  let cursor = from;
  while (cursor <= to) {
    result.push({ yearMonth: cursor, total: lookup.get(cursor) ?? 0 });
    cursor = addMonths(cursor, 1);
  }

  return result;
}