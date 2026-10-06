import { addDays } from "@/lib/format/date";

export interface TargetWeek {
  /** 1-based, so "Week 1". */
  index: number;
  start: string;
  end: string;
  days: number;
  /** This week's share of the target, in proportion to its days. */
  limit: number;
}

function dayNumber(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
}

/** Inclusive number of days from start to end. */
export function daysBetween(start: string, end: string): number {
  return dayNumber(end) - dayNumber(start) + 1;
}

/**
 * Cut a target's period into 7-day weeks counted from its start, with a
 * shorter last week when the period does not divide evenly. The target amount
 * is shared out by days, in whole cents, with any leftover cents going to the
 * last week so the limits always add back up to the target.
 */
export function splitIntoWeeks(
  startDate: string,
  endDate: string,
  targetAmount: number,
): TargetWeek[] {
  const totalDays = daysBetween(startDate, endDate);
  if (totalDays <= 0) return [];

  const totalCents = Math.round(targetAmount * 100);
  const weeks: TargetWeek[] = [];
  let allocated = 0;

  for (let offset = 0, index = 1; offset < totalDays; offset += 7, index++) {
    const days = Math.min(7, totalDays - offset);
    const cents = Math.floor((totalCents * days) / totalDays);
    allocated += cents;
    weeks.push({
      index,
      start: addDays(startDate, offset),
      end: addDays(startDate, offset + days - 1),
      days,
      limit: cents / 100,
    });
  }

  const last = weeks[weeks.length - 1];
  last.limit = (Math.round(last.limit * 100) + (totalCents - allocated)) / 100;
  return weeks;
}

/** Total spend in each week, from dated transaction amounts. */
export function spendByWeek(
  weeks: TargetWeek[],
  rows: { date: string; amount: number }[],
): number[] {
  const cents = weeks.map(() => 0);
  for (const row of rows) {
    const i = weeks.findIndex((w) => row.date >= w.start && row.date <= w.end);
    if (i >= 0) cents[i] += Math.round(row.amount * 100);
  }
  return cents.map((c) => c / 100);
}

/** The week containing today, or null when today is outside the period. */
export function currentWeekIndex(weeks: TargetWeek[], today: string): number | null {
  const week = weeks.find((w) => today >= w.start && today <= w.end);
  return week ? week.index : null;
}
