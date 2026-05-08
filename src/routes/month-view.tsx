import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { MonthHeader } from "@/components/transactions/month-header";
import { MonthSummaryCard } from "@/components/transactions/month-summary-card";
import { useMonthTransactions } from "@/queries/use-month-transactions";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
  calculateMonthSummary,
  type MonthMeta,
} from "@/lib/calculations/month-summary";
import {
  currentYearMonth,
  lastDayOfMonth,
} from "@/lib/format/year-month";
import { todayISO } from "@/lib/format/date";

export function MonthView() {
  const { budgetId, yearMonth } = useParams<{
    budgetId: string;
    yearMonth: string;
  }>();

  const { data: transactions, isLoading } = useMonthTransactions(
    budgetId,
    yearMonth,
  );

  // Build the calendar metadata for this month. Done in the route because
  // it depends on "today" — keeping it out of the pure calculator.
  const monthMeta = useMemo<MonthMeta | null>(() => {
    if (!yearMonth) return null;
    const lastDay = lastDayOfMonth(yearMonth); // "YYYY-MM-DD"
    const totalDays = Number(lastDay.slice(-2));
    const today = todayISO();
    const current = currentYearMonth();

    let daysElapsed: number;
    if (yearMonth < current) {
      // Past month — entire month elapsed
      daysElapsed = totalDays;
    } else if (yearMonth > current) {
      // Future month — nothing elapsed yet
      daysElapsed = 0;
    } else {
      // Current month — days so far (today's day-of-month)
      daysElapsed = Number(today.slice(-2));
    }

    return { yearMonth, totalDays, daysElapsed };
  }, [yearMonth]);

  if (!budgetId || !yearMonth || !monthMeta) {
    return null;
  }

  const summary =
    transactions && transactions.length > 0
      ? calculateMonthSummary(transactions, monthMeta)
      : null;

  return (
    <div className="space-y-6">
      <MonthHeader budgetId={budgetId} yearMonth={yearMonth} />

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : summary ? (
        <MonthSummaryCard yearMonth={yearMonth} summary={summary} />
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>No transactions logged this month yet.</p>
            <p className="mt-1 text-sm">
              Switch to the Day view to start logging.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}