import { useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
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

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function MonthHeader({ budgetId, yearMonth }: MonthHeaderProps) {
  const navigate = useNavigate();
  const current = currentYearMonth();
  const isCurrent = yearMonth === current;

  const [y, m] = yearMonth.split("-").map(Number);
  const [pickerYear, setPickerYear] = useState(y);
  const [pickerMonth, setPickerMonth] = useState(m);

  const goTo = (ym: YearMonth) =>
    navigate(`/app/budgets/${budgetId}/month/${ym}`);

  const buildYM = (year: number, month: number): YearMonth =>
    `${year}-${String(month).padStart(2, "0")}` as YearMonth;

  const todayYear = new Date().getFullYear();
  const minYear = Math.min(pickerYear, todayYear) - 10;
  const maxYear = Math.max(pickerYear, todayYear) + 1;
  const years: number[] = [];
  for (let yr = maxYear; yr >= minYear; yr--) years.push(yr);

  return (
    <div className="flex items-center justify-between gap-2 flex-wrap gap-y-2 border-b pb-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant="outline"
          size="icon"
          aria-label="Previous month"
          onClick={() => goTo(addMonths(yearMonth, -1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        {/* Fixed width so the arrows don't shift as the month name changes. */}
        <h2 className="w-36 sm:w-48 text-center text-base sm:text-xl font-semibold tabular-nums">
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

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon" aria-label="Pick a month">
              <CalendarDays className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-3" align="start">
            <div className="flex flex-col gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Month</Label>
                <Select
                  value={String(pickerMonth)}
                  onValueChange={(v) => {
                    const newMonth = Number(v);
                    setPickerMonth(newMonth);
                    goTo(buildYM(pickerYear, newMonth));
                  }}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTH_NAMES.map((name, idx) => (
                      <SelectItem key={name} value={String(idx + 1)}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Year</Label>
                <Select
                  value={String(pickerYear)}
                  onValueChange={(v) => {
                    const newYear = Number(v);
                    setPickerYear(newYear);
                    goTo(buildYM(newYear, pickerMonth));
                  }}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((yr) => (
                      <SelectItem key={yr} value={String(yr)}>
                        {yr}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </PopoverContent>
        </Popover>
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

