import { useQueries } from "@tanstack/react-query";
import { useTargets } from "./use-targets";
import { targetSpentQuery } from "./use-target-spent";
import { selectTargetAlerts, type TargetAlert } from "@/lib/calculations/target-alerts";

/** Targets running on `date` that are at 80% or more of their amount. */
export function useTargetAlerts(budgetId: string | undefined, date: string): TargetAlert[] {
  const { data: targets } = useTargets(budgetId);
  const running = (targets ?? []).filter((t) => t.start_date <= date && date <= t.end_date);

  // Same query definition (and cache entry) the Targets page uses.
  return useQueries({
    queries: running.map((t) => targetSpentQuery(budgetId, t)),
    combine: (results) =>
      selectTargetAlerts(
        running.flatMap((target, i) => {
          const spent = results[i]?.data;
          return spent === undefined ? [] : [{ target, spent }];
        }),
        date,
      ),
  });
}
