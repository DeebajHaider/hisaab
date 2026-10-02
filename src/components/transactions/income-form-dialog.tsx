import { useState, useEffect, type FormEvent, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateIncome,
  useUpdateIncome,
} from "@/queries/use-income-mutations";
import type { IncomeEntry } from "@/queries/use-income";
import {
  firstDayOfMonth,
  lastDayOfMonth,
  type YearMonth,
} from "@/lib/format/year-month";
import { todayISO } from "@/lib/format/date";

interface IncomeFormDialogProps {
  budgetId: string;
  yearMonth: YearMonth;
  existing?: IncomeEntry;
  // Uncontrolled: provide trigger; dialog manages its own open state.
  // Controlled: provide open + onOpenChange; trigger optional.
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

/**
 * Add or edit an income entry. Mirrors item-form-dialog's structure.
 *
 * The date input is constrained to dates within the viewed month — picking
 * outside the month would silently push the entry into a different month.
 * Defaults to today if today is in the viewed month, otherwise day 1.
 */
export function IncomeFormDialog({
  budgetId,
  yearMonth,
  existing,
  trigger,
  open: openProp,
  onOpenChange,
}: IncomeFormDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : internalOpen;
  const setOpen = (next: boolean) => {
    if (isControlled) {
      onOpenChange?.(next);
    } else {
      setInternalOpen(next);
    }
  };
  const [source, setSource] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const createMutation = useCreateIncome();
  const updateMutation = useUpdateIncome();
  const isEditing = !!existing;

  const minDate = firstDayOfMonth(yearMonth);
  const maxDate = lastDayOfMonth(yearMonth);

  useEffect(() => {
    if (open) {
      setSource(existing?.source ?? "");
      setAmount(existing ? String(existing.amount) : "");
      // Smart default for date: today if it falls in the month, else day 1
      const defaultDate = (() => {
        if (existing?.date) return existing.date;
        const today = todayISO();
        return today >= minDate && today <= maxDate ? today : minDate;
      })();
      setDate(defaultDate);
      setNotes(existing?.notes ?? "");
      setError(null);
    }
  }, [open, existing, minDate, maxDate]);

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedSource = source.trim();
    if (!trimmedSource) {
      setError("Source is required");
      return;
    }

    const parsedAmount = Number(amount);
    if (Number.isNaN(parsedAmount) || parsedAmount < 0) {
      setError("Amount must be a non-negative number");
      return;
    }

    if (!date || date < minDate || date > maxDate) {
      setError("Date must be within the viewed month");
      return;
    }

    const trimmedNotes = notes.trim() || null;

    try {
      if (isEditing) {
        await updateMutation.mutateAsync({
          id: existing.id,
          budgetId,
          patch: {
            source: trimmedSource,
            amount: parsedAmount,
            date,
            notes: trimmedNotes,
          },
        });
      } else {
        await createMutation.mutateAsync({
          budgetId,
          source: trimmedSource,
          amount: parsedAmount,
          date,
          notes: trimmedNotes,
        });
      }
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit income" : "Add income"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update this income entry."
              : "Log money coming in this month — salary, freelance, gifts."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="income-source">Source</Label>
            <Input
              id="income-source"
              placeholder="e.g. Salary, Freelance"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              required
              maxLength={100}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="income-amount">Amount</Label>
              <Input
                id="income-amount"
                type="number"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min={0}
                step="0.01"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="income-date">Date</Label>
              <Input
                id="income-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={minDate}
                max={maxDate}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="income-notes">Notes (optional)</Label>
            <Textarea
              id="income-notes"
              placeholder="Any details..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
              rows={2}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-accent-solid hover:bg-accent-solid-hover text-white"
              disabled={isPending || !source.trim() || !amount}
            >
              {isPending
                ? isEditing
                  ? "Saving..."
                  : "Adding..."
                : isEditing
                  ? "Save"
                  : "Add"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}