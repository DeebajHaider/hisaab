import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { useTargetTransactions } from "@/queries/use-target-spent";
import { calculateProgress } from "@/lib/calculations/target-progress";
import { currentWeekIndex, spendByWeek, splitIntoWeeks } from "@/lib/calculations/target-weeks";
import { formatDayLabel, todayISO } from "@/lib/format/date";
import { cn } from "@/lib/utils";
import type { Target } from "@/queries/use-targets";

const BAR_COLOR = {
  under: "bg-emerald-500",
  near: "bg-amber-500",
  over: "bg-red-500",
} as const;

function money(amount: number, currency: string): string {
  return `${currency} ${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** A target's period split into weeks, each with its share of the amount and
 *  what was spent in it. Collapsed by default; loads its data on first open. */
export function TargetWeeklyBreakdown({
  budgetId,
  target,
  currency,
}: {
  budgetId: string;
  target: Target;
  currency: string;
}) {
  const [open, setOpen] = useState(false);
  const rowsQuery = useTargetTransactions(budgetId, target, open);

  const weeks = splitIntoWeeks(target.start_date, target.end_date, target.target_amount);
  // A single week is just the whole target again.
  if (weeks.length < 2) return null;

  const spent = spendByWeek(weeks, rowsQuery.data ?? []);
  const current = currentWeekIndex(weeks, todayISO());

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-90")} />
        Weekly breakdown
      </button>

      {open && (
        <div className="mt-2 space-y-2.5">
          {rowsQuery.isLoading ? (
            <p className="text-xs text-muted-foreground">Loading…</p>
          ) : rowsQuery.error ? (
            <p className="text-xs text-destructive">Couldn't load the weekly spend.</p>
          ) : (
            weeks.map((week, i) => {
              const { percent, status } = calculateProgress(spent[i], week.limit);
              const isCurrent = week.index === current;
              const isFuture = todayISO() < week.start;
              return (
                <div
                  key={week.index}
                  className={cn(
                    "space-y-1 rounded-md px-2 py-1.5",
                    isCurrent && "bg-muted/50 ring-1 ring-border",
                  )}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  <div className="flex items-baseline justify-between gap-2 text-xs">
                    <span className="font-medium">
                      Week {week.index}
                      {isCurrent && <span className="ml-1.5 text-accent-text">this week</span>}
                    </span>
                    <span className="text-muted-foreground">
                      {formatDayLabel(week.start)} – {formatDayLabel(week.end)}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn("h-full rounded-full", BAR_COLOR[status])}
                      style={{ width: `${Math.min(percent, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs tabular-nums">
                    <span className={cn(status === "over" && "text-red-600 dark:text-red-400")}>
                      {isFuture ? "Not started" : money(spent[i], currency)}
                    </span>
                    <span className="text-muted-foreground">of {money(week.limit, currency)}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
