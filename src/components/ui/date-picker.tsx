import { CalendarDays } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { formatDayLabel, toISODate } from "@/lib/format/date";
import type { ReactNode } from "react";

interface DatePickerProps {
  /** ISO date (YYYY-MM-DD) — current selection. */
  value: string;
  /** Called with a new ISO date when the user picks one. */
  onChange: (iso: string) => void;
  /** Optional custom trigger; defaults to a small outline button with the date label. */
  trigger?: ReactNode;
  /** aria-label for the default trigger. */
  ariaLabel?: string;
}

/**
 * A shared popover-calendar date picker for day-granular selection. Used by:
 *   - DayHeader, to jump to any day from the day view.
 *   - TransactionEntryForm in edit mode, to change a transaction's date.
 *
 * Receives and emits ISO dates (YYYY-MM-DD) so callers don't have to know
 * about Date objects or timezone conversion — the parsing happens here using
 * local-timezone construction, matching lib/format/date.ts conventions.
 */
export function DatePicker({ value, onChange, trigger, ariaLabel }: DatePickerProps) {
  // Parse the ISO string locally — never `new Date(iso)`, which is UTC.
  const [y, m, d] = value.split("-").map(Number);
  const selected = new Date(y, m - 1, d);

  return (
    <Popover>
      <PopoverTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="h-8" aria-label={ariaLabel ?? "Pick a date"}>
            <CalendarDays className="w-3.5 h-3.5 mr-1.5" />
            {formatDayLabel(value)}
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          // Remount whenever the bound value changes. The underlying
          // DayPicker only computes its initially-displayed month once, at
          // mount, from `selected` — it doesn't re-sync on prop changes.
          // Without this key, a value set programmatically (e.g. a preset
          // button far from the currently-displayed month) updates the
          // trigger label but leaves the calendar grid showing the wrong
          // month until the user manually navigates it.
          key={value}
          mode="single"
          selected={selected}
          onSelect={(date) => {
            if (date) onChange(toISODate(date));
          }}
          captionLayout="dropdown"
        />
      </PopoverContent>
    </Popover>
  );
}

