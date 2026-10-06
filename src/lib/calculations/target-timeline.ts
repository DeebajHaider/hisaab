import { daysBetween } from "./target-weeks";

export type TargetPhase = "upcoming" | "active" | "ended";

export interface TargetTimeline {
  phase: TargetPhase;
  totalDays: number;
  /** Days of the period done, counting today. 0 before it starts. */
  daysElapsed: number;
  /** Days left, counting today. 0 once ended; days until the start while upcoming (1 means tomorrow). */
  daysRemaining: number;
  /** Target minus spent. Negative when over. */
  remaining: number;
  /** What can still be spent each remaining day to land on the target. Null if not applicable. */
  perDayLeft: number | null;
  /** Average spend per elapsed day so far. Null when nothing is elapsed or spent. */
  avgPerDay: number | null;
}

/** Where a target stands in time, and what that implies for spending. */
export function targetTimeline(input: {
  spent: number;
  targetAmount: number;
  startDate: string;
  endDate: string;
  today: string;
}): TargetTimeline {
  const { spent, targetAmount, startDate, endDate, today } = input;
  const totalDays = daysBetween(startDate, endDate);
  const remaining = Math.round((targetAmount - spent) * 100) / 100;

  if (today < startDate) {
    return {
      phase: "upcoming",
      totalDays,
      daysElapsed: 0,
      daysRemaining: daysBetween(today, startDate) - 1,
      remaining,
      perDayLeft: null,
      avgPerDay: null,
    };
  }
  if (today > endDate) {
    return {
      phase: "ended",
      totalDays,
      daysElapsed: totalDays,
      daysRemaining: 0,
      remaining,
      perDayLeft: null,
      avgPerDay: totalDays > 0 && spent > 0 ? spent / totalDays : null,
    };
  }

  const daysElapsed = daysBetween(startDate, today);
  const daysRemaining = totalDays - daysElapsed + 1;
  return {
    phase: "active",
    totalDays,
    daysElapsed,
    daysRemaining,
    remaining,
    perDayLeft: remaining > 0 ? remaining / daysRemaining : null,
    avgPerDay: spent > 0 ? spent / daysElapsed : null,
  };
}

/** "12 days remaining", "Last day", "Starts in 3 days", "Ended 5 days ago". */
export function describeTimeline(t: TargetTimeline, endDate: string, today: string): string {
  const plural = (n: number) => `${n} day${n === 1 ? "" : "s"}`;
  if (t.phase === "upcoming") {
    return t.daysRemaining === 1 ? "Starts tomorrow" : `Starts in ${plural(t.daysRemaining)}`;
  }
  if (t.phase === "ended") return `Ended ${plural(daysBetween(endDate, today) - 1)} ago`;
  return t.daysRemaining === 1 ? "Last day" : `${plural(t.daysRemaining)} remaining`;
}
