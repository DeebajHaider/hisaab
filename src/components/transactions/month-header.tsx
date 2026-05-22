import { ChevronLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ExportTransactionsButton } from "@/components/manage/export-transactions-button";
import {
  addMonths,
  currentYearMonth,
  firstDayOfMonth,
  formatMonthLabel,
  lastDayOfMonth,
  type YearMonth,
} from "@/lib/format/year-month";

interface MonthHeaderProps {
  budgetId: string;
  yearMonth: YearMonth;
}

/**
 * Header for the Month view: prev / label / next, plus a "Current month"
 * shortcut shown when not already on the current month, and an export
 * button that downloads this month's transactions as a CSV.
 *
 * Parallel in shape to DayHeader. Navigation is route-driven — clicking
 * a button updates the URL, which re-runs the query via useMonthTransactions.
 */
export function MonthHeader({ budgetId, yearMonth }: MonthHeaderProps) {
  const navigate = useNavigate();
  const current = currentYearMonth();
  const isCurrent = yearMonth === current;

  const goTo = (ym: YearMonth) => {
    navigate(`/app/budgets/${budgetId}/month/${ym}`);
  };

  return (
    <div className="flex items-center justify-between gap-2 border-b pb-4">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          aria-label="Previous month"
          onClick={() => goTo(addMonths(yearMonth, -1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-xl font-semibold tabular-nums">
          {formatMonthLabel(yearMonth)}
        </h2>
        <Button
          variant="outline"
          size="icon"
          aria-label="Next month"
          onClick={() => goTo(addMonths(yearMonth, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex items-center gap-2">
        {!isCurrent && (
          <Button variant="ghost" size="sm" onClick={() => goTo(current)}>
            Current month
          </Button>
        )}
        <ExportTransactionsButton
          budgetId={budgetId}
          from={firstDayOfMonth(yearMonth)}
          to={lastDayOfMonth(yearMonth)}
          filenameSuffix={yearMonth}
          label="Export"
        />
      </div>
    </div>
  );
}

