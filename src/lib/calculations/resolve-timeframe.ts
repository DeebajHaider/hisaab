import { addMonths, type YearMonth } from "@/lib/format/year-month";

export type Timeframe = "1M" | "3M" | "6M" | "1Y" | "3Y" | "5Y" | "All";

export const TIMEFRAMES: Timeframe[] = ["1M", "3M", "6M", "1Y", "3Y", "5Y", "All"];

/**
 * How many months back each preset spans (inclusive of current month).
 * "All" is handled separately because it depends on the earliest
 * transaction month, not a fixed offset.
 */
const TIMEFRAME_MONTHS: Record<Exclude<Timeframe, "All">, number> = {
  "1M": 1,
  "3M": 3,
  "6M": 6,
  "1Y": 12,
  "3Y": 36,
  "5Y": 60,
};

/**
 * Compute the from/to YearMonth bounds for a given timeframe.
 *
 * - For preset timeframes: from = current - (N - 1) months, to = current.
 *   Clamped to earliestMonth so picking 5Y on 8 months of data shows
 *   only the 8 months, not 4 years of zeros before the data started.
 * - For "All": from = earliestMonth (or current if null), to = current.
 */
export function resolveTimeframe(
  timeframe: Timeframe,
  currentMonth: YearMonth,
  earliestMonth: YearMonth | null,
): { from: YearMonth; to: YearMonth } {
  if (timeframe === "All") {
    return {
      from: earliestMonth ?? currentMonth,
      to: currentMonth,
    };
  }

  const monthsBack = TIMEFRAME_MONTHS[timeframe];
  let from = addMonths(currentMonth, -(monthsBack - 1));

  // Clamp to earliestMonth if the timeframe extends before any data exists.
  // String comparison works because YYYY-MM is lexically sortable.
  if (earliestMonth && from < earliestMonth) {
    from = earliestMonth;
  }

  return { from, to: currentMonth };
}