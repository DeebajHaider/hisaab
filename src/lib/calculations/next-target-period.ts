import { addDays } from "@/lib/format/date";

/**
 * How many days a [startDate, endDate] range spans, inclusive.
 * Parses parts directly rather than `new Date(iso)` to stay in local time,
 * matching the rest of lib/format/date.ts's timezone-safety convention.
 */
function inclusiveDayCount(startDate: string, endDate: string): number {
  const toLocalDate = (iso: string) => {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(y, m - 1, d);
  };
  const ms = toLocalDate(endDate).getTime() - toLocalDate(startDate).getTime();
  return Math.round(ms / 86_400_000) + 1;
}

/**
 * The entire "renew" mechanism for targets: given an existing target's
 * range, compute the next range of the same length starting right after it
 * ends. A week stays a week, a month-as-entered stays that many days —
 * there's no stored "this was a weekly/monthly target" flag, just the
 * original start/end dates, so renewing is pure arithmetic on them.
 */
export function nextPeriod(
  startDate: string,
  endDate: string,
): { start: string; end: string } {
  const duration = inclusiveDayCount(startDate, endDate);
  const start = addDays(endDate, 1);
  const end = addDays(start, duration - 1);
  return { start, end };
}
