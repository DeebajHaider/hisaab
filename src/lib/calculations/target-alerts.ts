import { calculateProgress, type TargetStatus } from "./target-progress";
import type { Target } from "@/queries/use-targets";

export interface TargetWithSpent {
  target: Pick<Target, "id" | "name" | "target_amount" | "start_date" | "end_date">;
  spent: number;
}

export interface TargetAlert extends TargetWithSpent {
  status: Exclude<TargetStatus, "under">;
  /** Uncapped. */
  percent: number;
}

/** Targets running on `date` that have reached 80% of their amount, most
 *  overspent first. */
export function selectTargetAlerts(entries: TargetWithSpent[], date: string): TargetAlert[] {
  const alerts: TargetAlert[] = [];
  for (const entry of entries) {
    const { start_date, end_date, target_amount } = entry.target;
    if (date < start_date || date > end_date) continue;
    const { percent, status } = calculateProgress(entry.spent, target_amount);
    if (status === "under") continue;
    alerts.push({ ...entry, status, percent });
  }
  return alerts.sort((a, b) => b.percent - a.percent);
}
