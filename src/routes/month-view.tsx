import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { MonthHeader } from "@/components/transactions/month-header";
import { MonthSummaryCard } from "@/components/transactions/month-summary-card";
import { VarianceCard } from "@/components/transactions/variance-card";
import { IncomeSection } from "@/components/transactions/income-section";
import { SavingsSection } from "@/components/transactions/savings-section";
import { useMonthTransactions } from "@/queries/use-month-transactions";
import { useIncome } from "@/queries/use-income";
import { useSavings } from "@/queries/use-savings";
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
import { CategoryBreakdownChart } from "@/components/charts/category-breakdown-chart";
import { getCategoryBreakdown } from "@/lib/calculations/category-breakdown";

export function MonthView() {
  const { budgetId, yearMonth } = useParams<{
    budgetId: string;
    yearMonth: string;
  }>();

  const txQuery = useMonthTransactions(budgetId, yearMonth);
  const incomeQuery = useIncome(budgetId, yearMonth);
  const savingsQuery = useSavings(budgetId, yearMonth);

  const isLoading =
    txQuery.isLoading || incomeQuery.isLoading || savingsQuery.isLoading;

  const monthMeta = useMemo<MonthMeta | null>(() => {
    if (!yearMonth) return null;
    const lastDay = lastDayOfMonth(yearMonth);
    const totalDays = Number(lastDay.slice(-2));
    const today = todayISO();
    const current = currentYearMonth();

    let daysElapsed: number;
    if (yearMonth < current) {
      daysElapsed = totalDays;
    } else if (yearMonth > current) {
      daysElapsed = 0;
    } else {
      daysElapsed = Number(today.slice(-2));
    }

    return { yearMonth, totalDays, daysElapsed };
  }, [yearMonth]);

  if (!budgetId || !yearMonth || !monthMeta) {
    return null;
  }

  const transactions = txQuery.data ?? [];
  const income = incomeQuery.data ?? [];
  const savings = savingsQuery.data ?? [];

  const hasAnyData =
    transactions.length > 0 || income.length > 0 || savings.length > 0;

  // Sums for variance, computed in dollars. The variance helper itself
  // converts to cents internally — we don't need to here.
  const incomeTotal = income.reduce((sum, e) => sum + Number(e.amount), 0);
  const savingsTotal = savings.reduce((sum, e) => sum + Number(e.amount), 0);

  // The full summary calc — pass to the card only when there are transactions
  const summary =
    transactions.length > 0
      ? calculateMonthSummary(transactions, monthMeta)
      : null;

  const breakdown =
    transactions.length > 0 ? getCategoryBreakdown(transactions) : [];

  const expensesTotal = summary?.totalExpenses ?? 0;

  return (
    <div className="space-y-6">
      <MonthHeader budgetId={budgetId} yearMonth={yearMonth} />

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : !hasAnyData ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>No activity logged this month yet.</p>
            <p className="mt-1 text-sm">
              Log expenses from the Day view, or add income and savings below.
            </p>
            {/* The Income/Savings sections render below the empty state too,
                so the user has the Add buttons available. */}
          </CardContent>
        </Card>
      ) : (
        <>
          <VarianceCard
            income={incomeTotal}
            expenses={expensesTotal}
            savings={savingsTotal}
          />
          {summary && (
            <MonthSummaryCard yearMonth={yearMonth} summary={summary} />
          )}
          {breakdown.length > 0 && (
            <CategoryBreakdownChart breakdown={breakdown} />
          )}
        </>
      )}

      {/* Income and Savings sections always render so Add buttons are
          accessible even when the month is empty. */}
      <IncomeSection budgetId={budgetId} yearMonth={yearMonth} />
      <SavingsSection budgetId={budgetId} yearMonth={yearMonth} />
    </div>
  );
}