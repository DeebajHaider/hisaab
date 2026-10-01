import { addMonths, firstDayOfMonth } from "@/lib/format/year-month";

export type LedgerPreset = "this-month" | "this-year" | "last-12-months" | "all-time";

export const LEDGER_PRESETS: LedgerPreset[] = [
  "this-month",
  "this-year",
  "last-12-months",
  "all-time",
];

/**
 * Resolve a Ledger preset to a { from, to } ISO date range.
 *
 * "custom" isn't handled here — picking a preset just seeds the page's
 * from/to state, which the user can then freely edit (e.g. to an
 * arbitrary July→June range for taxes). Only the four named presets are
 * computed by this pure function.
 *
 * Unlike resolve-timeframe.ts (which clamps every preset to the earliest
 * transaction, because an unclamped range there would pad a chart with
 * empty months), the calendar presets here are NOT clamped: this is a
 * date-range filter over a query, not a chart axis, and a range with no
 * matching transactions just shows an empty result — which is correct.
 * Clamping them caused a real bug: when the budget's history is shorter
 * than a preset's natural span, several presets collapsed to the exact
 * same clamped range, so clicking between them appeared to do nothing.
 * Only "all-time" is inherently data-anchored — "the earliest transaction"
 * has no other definition — so it's the only one that reads earliestDate.
 */
export function resolveLedgerPreset(
  preset: LedgerPreset,
  today: string,
  earliestDate: string | null,
): { from: string; to: string } {
  if (preset === "all-time") {
    return { from: earliestDate ?? today, to: today };
  }

  if (preset === "this-year") {
    return { from: `${today.slice(0, 4)}-01-01`, to: today };
  }

  const currentMonth = today.slice(0, 7);

  if (preset === "last-12-months") {
    return { from: firstDayOfMonth(addMonths(currentMonth, -11)), to: today };
  }

  // this-month
  return { from: firstDayOfMonth(currentMonth), to: today };
}
