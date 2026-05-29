import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { todayISO, addDays, formatDayLabel } from "@/lib/format/date";

interface DayHeaderProps {
  budgetId: string;
  date: string; // yyyy-mm-dd
  total: number;
  currency: string;
}

/**
 * Header for the day view: prev/next nav, friendly date label, day total.
 * Also offers a calendar popover for jumping to any date — important for
 * back-filling old transactions where stepping one day at a time is tedious.
 */
export function DayHeader({ budgetId, date, total, currency }: DayHeaderProps) {
  const navigate = useNavigate();
  const prevDate = addDays(date, -1);
  const nextDate = addDays(date, 1);
  const today = todayISO();
  const isToday = date === today;

  const goTo = (iso: string) => navigate(`/app/budgets/${budgetId}/day/${iso}`);

  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" asChild className="w-9 h-9">
          <Link to={`/app/budgets/${budgetId}/day/${prevDate}`} aria-label="Previous day">
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
          <Link to={`/app/budgets/${budgetId}/day/${nextDate}`} aria-label="Next day">
            <ChevronRight className="w-4 h-4" />
          </Link>
        </Button>

        {/* Day picker — pops a calendar for non-adjacent jumps. */}
        <DatePicker
          value={date}
          onChange={goTo}
          ariaLabel="Pick a date"
          trigger={
            <Button variant="ghost" size="icon" className="w-9 h-9" aria-label="Pick a date">
              <CalendarDays className="w-4 h-4" />
            </Button>
          }
        />

        {!isToday && (
          <Button variant="ghost" size="sm" asChild className="ml-1 h-8">
            <Link to={`/app/budgets/${budgetId}/day/${today}`}>Today</Link>
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

