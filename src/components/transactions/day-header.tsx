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

export function DayHeader({ budgetId, date, total, currency }: DayHeaderProps) {
  const navigate = useNavigate();
  const prevDate = addDays(date, -1);
  const nextDate = addDays(date, 1);
  const today = todayISO();
  const isToday = date === today;

  const goTo = (iso: string) => navigate(`/app/budgets/${budgetId}/day/${iso}`);

  return (
    <div className="flex items-start justify-between flex-wrap gap-y-4">
      <div className="flex items-center gap-1 flex-wrap">
        <Button variant="ghost" size="icon" asChild className="w-9 h-9 shrink-0">
          <Link to={`/app/budgets/${budgetId}/day/${prevDate}`} aria-label="Previous day">
            <ChevronLeft className="w-4 h-4" />
          </Link>
        </Button>

        {/* Fixed width so the arrows don't shift as the day label changes.
            This is the page's de facto title — Day view has no separate
            heading — so it carries real weight instead of reading as a
            small nav widget. */}
        <div className="w-36 sm:w-44 px-1 text-center">
          <div className="text-2xl sm:text-3xl font-semibold tracking-tight">
            {formatDayLabel(date)}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">{date}</div>
        </div>

        <Button variant="ghost" size="icon" asChild className="w-9 h-9 shrink-0">
          <Link to={`/app/budgets/${budgetId}/day/${nextDate}`} aria-label="Next day">
            <ChevronRight className="w-4 h-4" />
          </Link>
        </Button>

        <DatePicker
          value={date}
          onChange={goTo}
          ariaLabel="Pick a date"
          trigger={
            <Button variant="ghost" size="icon" className="w-9 h-9 shrink-0" aria-label="Pick a date">
              <CalendarDays className="w-4 h-4" />
            </Button>
          }
        />

        {!isToday && (
          <Button variant="ghost" size="sm" asChild className="ml-1 h-8 shrink-0">
            <Link to={`/app/budgets/${budgetId}/day/${today}`}>Today</Link>
          </Button>
        )}
      </div>

      <div className="text-right">
        <div className="text-xs text-muted-foreground uppercase tracking-wide">Day total</div>
        <div className="text-2xl sm:text-3xl font-semibold tracking-tight tabular-nums mt-0.5">
          {currency}{" "}
          {total.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </div>
      </div>
    </div>
  );
}
