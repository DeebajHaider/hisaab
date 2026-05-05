import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { todayISO, addDays, formatDayLabel } from "@/lib/format/date";

interface DayHeaderProps {
  budgetId: string;
  date: string; // yyyy-mm-dd
  total: number;
  currency: string;
}

/**
 * Header for the day view: prev/next nav, friendly date label, day total.
 */
export function DayHeader({ budgetId, date, total, currency }: DayHeaderProps) {
  const prevDate = addDays(date, -1);
  const nextDate = addDays(date, 1);
  const today = todayISO();
  const isToday = date === today;

  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" asChild className="w-9 h-9">
          <Link
            to={`/app/budgets/${budgetId}/day/${prevDate}`}
            aria-label="Previous day"
          >
            <ChevronLeft className="w-4 h-4" />
          </Link>
        </Button>

        <div className="px-2">
          <div className="font-semibold tracking-tight">
            {formatDayLabel(date)}
          </div>
          <div className="text-xs text-muted-foreground">{date}</div>
        </div>

        <Button variant="ghost" size="icon" asChild className="w-9 h-9">
          <Link
            to={`/app/budgets/${budgetId}/day/${nextDate}`}
            aria-label="Next day"
          >
            <ChevronRight className="w-4 h-4" />
          </Link>
        </Button>

        {!isToday && (
          <Button variant="ghost" size="sm" asChild className="ml-2 h-8">
            <Link to={`/app/budgets/${budgetId}/day/${today}`}>
              <CalendarDays className="w-3.5 h-3.5 mr-1" />
              Today
            </Link>
          </Button>
        )}
      </div>

      <div className="text-right">
        <div className="text-xs text-muted-foreground">Day total</div>
        <div className="text-lg font-semibold tabular-nums">
          {currency} {total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div>
    </div>
  );
}