import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { useTargetAlerts } from "@/queries/use-target-alerts";
import { cn } from "@/lib/utils";

const BAR_COLOR = { near: "bg-amber-500", over: "bg-red-500" } as const;
const TEXT_COLOR = {
  near: "text-amber-600 dark:text-amber-400",
  over: "text-red-600 dark:text-red-400",
} as const;

function money(amount: number, currency: string): string {
  return `${currency} ${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Slim warning for targets at 80%+ on the day being viewed. Renders nothing
 *  when every target is comfortably under, so it only appears when it matters. */
export function TargetAlerts({
  budgetId,
  date,
  currency,
}: {
  budgetId: string;
  date: string;
  currency: string;
}) {
  const alerts = useTargetAlerts(budgetId, date);
  if (alerts.length === 0) return null;

  return (
    <section aria-label="Targets needing attention" className="space-y-2">
      {alerts.map(({ target, spent, status, percent }) => (
        <Link
          key={target.id}
          to={`/app/budgets/${budgetId}/targets`}
          className="block rounded-lg glass px-4 py-3 transition-colors hover:bg-muted/20"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="min-w-0 truncate text-sm font-medium">{target.name}</span>
            <span className={cn("flex shrink-0 items-center gap-1 text-xs font-medium tabular-nums", TEXT_COLOR[status])}>
              {status === "over"
                ? `${money(spent - target.target_amount, currency)} over`
                : `${Math.floor(percent)}% used`}
              <ChevronRight className="h-3.5 w-3.5 opacity-60" />
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full", BAR_COLOR[status])}
              style={{ width: `${Math.min(percent, 100)}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground tabular-nums">
            {money(spent, currency)} of {money(target.target_amount, currency)}
          </p>
        </Link>
      ))}
    </section>
  );
}
