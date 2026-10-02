export type TargetStatus = "under" | "near" | "over";

export interface TargetProgress {
  /** Uncapped — can exceed 100. The progress bar clamps the visual width, not this value. */
  percent: number;
  status: TargetStatus;
}

const NEAR_THRESHOLD = 80;
const OVER_THRESHOLD = 100;

/**
 * Spend-vs-target progress. Thresholds: under 80% is comfortably under
 * (emerald, matching the app's existing gain color), 80-99.9% is getting
 * close (amber), 100%+ is over (red, matching the existing loss color).
 */
export function calculateProgress(spent: number, targetAmount: number): TargetProgress {
  const percent = targetAmount === 0 ? 0 : (spent / targetAmount) * 100;
  const status: TargetStatus =
    percent >= OVER_THRESHOLD ? "over" : percent >= NEAR_THRESHOLD ? "near" : "under";
  return { percent, status };
}
