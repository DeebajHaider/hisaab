import { todayISO } from "./date";

/**
 * A YearMonth is a string in the form "YYYY-MM" — e.g. "2026-05".
 *
 * Plain string alias rather than a branded type, mirroring the convention
 * used by ISO date strings elsewhere in this codebase. Helpers in this file
 * accept and return YearMonth strings; callers should treat the format as
 * a contract rather than a type-system guarantee.
 */
export type YearMonth = string;

/**
 * Add (or subtract) months from a YearMonth. Returns a new YearMonth.
 *
 * Implemented in pure integer arithmetic to dodge every Date/timezone
 * pitfall. We convert the (year, month) pair to a single "total months"
 * count, add n, then convert back.
 */
export function addMonths(ym: YearMonth, n: number): YearMonth {
  const [yearStr, monthStr] = ym.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr); // 1-12

  // Convert to zero-indexed total months from year 0.
  const totalMonths = year * 12 + (month - 1) + n;

  const newYear = Math.floor(totalMonths / 12);
  const newMonth = (totalMonths % 12) + 1;

  return `${newYear}-${String(newMonth).padStart(2, "0")}`;
}

/**
 * Format a YearMonth as a friendly display string, e.g. "May 2026".
 *
 * Uses the day-1 anchor (no day-overflow risk) and the user's browser
 * locale, matching formatDayLabel's convention in date.ts.
 */
export function formatMonthLabel(ym: YearMonth): string {
  const [yearStr, monthStr] = ym.split("-");
  const date = new Date(Number(yearStr), Number(monthStr) - 1, 1);
  return date.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

/**
 * Returns the first calendar day of the given month as an ISO date string.
 * e.g. "2026-05" → "2026-05-01"
 */
export function firstDayOfMonth(ym: YearMonth): string {
  return `${ym}-01`;
}

/**
 * Returns the last calendar day of the given month as an ISO date string.
 * Handles leap years correctly via the "day 0 of next month" trick:
 * new Date(year, month, 0) returns the last day of the previous month,
 * which JavaScript computes correctly for all leap-year cases.
 *
 * Local timezone is fine here — we only read the day number, never
 * serialize the Date back to ISO.
 */
export function lastDayOfMonth(ym: YearMonth): string {
  const [yearStr, monthStr] = ym.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr); // 1-12
  // Day 0 of (month + 1) = last day of month. Using 1-indexed month here
  // because JS Date's month arg is 0-indexed, so passing `month` (not
  // `month - 1`) gives us "next month" and day 0 rolls back one.
  const lastDay = new Date(year, month, 0).getDate();
  return `${ym}-${String(lastDay).padStart(2, "0")}`;
}

/**
 * Returns the current YearMonth in the user's local timezone.
 * Reuses todayISO to inherit its timezone-safe behavior.
 */
export function currentYearMonth(): YearMonth {
  return todayISO().slice(0, 7);
}