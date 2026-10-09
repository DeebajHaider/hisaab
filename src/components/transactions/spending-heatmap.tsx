import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildHeatmap } from "@/lib/calculations/spending-heatmap";
import { formatDayLabel } from "@/lib/format/date";
import { cn } from "@/lib/utils";
import type { TransactionWithRelations } from "@/queries/use-transactions";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const LEVEL_CLASS = [
  "bg-muted/40",
  "bg-accent-solid/25",
  "bg-accent-solid/45",
  "bg-accent-solid/70",
  "bg-accent-solid",
] as const;

/** The month as a calendar, each day shaded by how much was spent. Click a day to open it. */
export function SpendingHeatmap({
  budgetId,
  yearMonth,
  transactions,
  currency,
}: {
  budgetId: string;
  yearMonth: string;
  transactions: TransactionWithRelations[];
  currency: string;
}) {
  const weeks = buildHeatmap(yearMonth, transactions);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium text-muted-foreground">
          Spending by day
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-7 gap-1.5 text-center text-xs text-muted-foreground">
          {WEEKDAYS.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div className="space-y-1.5">
          {weeks.map((week, i) => (
            <div key={i} className="grid grid-cols-7 gap-1.5">
              {week.map((cell, j) =>
                cell.date ? (
                  <Link
                    key={cell.date}
                    to={`/app/budgets/${budgetId}/day/${cell.date}`}
                    title={`${formatDayLabel(cell.date)}: ${
                      cell.total > 0
                        ? `${currency} ${cell.total.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}`
                        : "nothing logged"
                    }`}
                    aria-label={`${formatDayLabel(cell.date)}, ${
                      cell.total > 0 ? `${currency} ${cell.total}` : "nothing logged"
                    }`}
                    className={cn(
                      "flex aspect-square items-center justify-center rounded-md text-xs tabular-nums transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-ring",
                      LEVEL_CLASS[cell.level],
                      cell.level >= 3 ? "text-white" : "text-foreground/80",
                    )}
                  >
                    {Number(cell.date.slice(-2))}
                  </Link>
                ) : (
                  <span key={`blank-${i}-${j}`} aria-hidden />
                ),
              )}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-end gap-1.5 text-xs text-muted-foreground">
          Less
          {LEVEL_CLASS.map((c) => (
            <span key={c} className={cn("h-3 w-3 rounded-sm", c)} aria-hidden />
          ))}
          More
        </div>
      </CardContent>
    </Card>
  );
}
