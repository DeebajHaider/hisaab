import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMonthTransactions } from "@/queries/use-month-transactions";
import { compareCategories } from "@/lib/calculations/month-compare";
import { addMonths, formatMonthLabel, type YearMonth } from "@/lib/format/year-month";
import { cn } from "@/lib/utils";
import type { TransactionWithRelations } from "@/queries/use-transactions";

function money(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** This month side by side with any other month, category by category. */
export function MonthCompareCard({
  budgetId,
  yearMonth,
  current,
  currency,
}: {
  budgetId: string;
  yearMonth: YearMonth;
  current: TransactionWithRelations[];
  currency: string;
}) {
  const [offset, setOffset] = useState(-1);
  const other = addMonths(yearMonth, offset);
  const otherQuery = useMonthTransactions(budgetId, other);
  const rows = compareCategories(current, otherQuery.data ?? []);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <CardTitle className="text-base font-medium text-muted-foreground">Compare</CardTitle>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => setOffset((o) => o - 1)}
            aria-label="Compare with an earlier month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-28 text-center text-sm">vs {formatMonthLabel(other)}</span>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => setOffset((o) => o + 1)}
            disabled={offset >= -1}
            aria-label="Compare with a later month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {otherQuery.isLoading ? (
          <p className="py-4 text-center text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Nothing logged in either month.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="pb-2 font-normal">Category</th>
                <th className="pb-2 text-right font-normal">{formatMonthLabel(yearMonth)}</th>
                <th className="pb-2 text-right font-normal">{formatMonthLabel(other)}</th>
                <th className="pb-2 text-right font-normal">Change</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {rows.map((row) => (
                <tr key={row.category}>
                  <td className="py-2 pr-2">{row.category}</td>
                  <td className="py-2 text-right tabular-nums">{money(row.a)}</td>
                  <td className="py-2 text-right tabular-nums text-muted-foreground">
                    {money(row.b)}
                  </td>
                  <td
                    className={cn(
                      "py-2 text-right tabular-nums font-medium",
                      row.diff > 0 && "text-amber-600 dark:text-amber-400",
                      row.diff < 0 && "text-accent-text",
                    )}
                  >
                    {row.diff === 0
                      ? "–"
                      : `${row.diff > 0 ? "+" : "−"}${money(Math.abs(row.diff))}`}
                    {row.percent !== null && row.diff !== 0 && (
                      <span className="ml-1 text-xs font-normal">
                        ({Math.round(Math.abs(row.percent))}%)
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="mt-2 text-xs text-muted-foreground">Amounts in {currency}.</p>
      </CardContent>
    </Card>
  );
}
