export interface TargetPace {
  /** Projected spend by the end date at the current daily rate. */
  projected: number;
  /** Projected spend as a percent of the target. */
  projectedPercent: number;
  /** Whether the projection ends above the target. */
  willExceed: boolean;
}

/** Fewer days than this and one big purchase makes the projection meaningless. */
export const MIN_DAYS_FOR_PACE = 3;

function dayNumber(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / 86_400_000);
}

/**
 * Straight-line projection of a target's spend to its end date. Returns null
 * when a projection would mislead: the period hasn't started or is over, it's
 * too early in it, nothing has been spent, or the target is already exceeded
 * (the progress bar says that better).
 */
export function projectTargetPace(input: {
  spent: number;
  targetAmount: number;
  startDate: string;
  endDate: string;
  today: string;
}): TargetPace | null {
  const { spent, targetAmount, startDate, endDate, today } = input;
  if (today < startDate || today > endDate) return null;
  if (spent <= 0 || targetAmount <= 0 || spent >= targetAmount) return null;

  const totalDays = dayNumber(endDate) - dayNumber(startDate) + 1;
  const elapsed = dayNumber(today) - dayNumber(startDate) + 1;
  if (elapsed < MIN_DAYS_FOR_PACE || elapsed >= totalDays) return null;

  const projected = (spent / elapsed) * totalDays;
  return {
    projected,
    projectedPercent: (projected / targetAmount) * 100,
    willExceed: projected > targetAmount,
  };
}
