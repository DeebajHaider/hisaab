import { useState, type FormEvent, type ReactNode } from "react";
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
  useCreateSavings,
  useUpdateSavings,
} from "@/queries/use-savings-mutations";
import type { SavingsEntry } from "@/queries/use-savings";
import {
  firstDayOfMonth,
  lastDayOfMonth,
  type YearMonth,
} from "@/lib/format/year-month";
import { todayISO } from "@/lib/format/date";

interface SavingsFormDialogProps {
  budgetId: string;
  yearMonth: YearMonth;
  existing?: SavingsEntry;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function SavingsFormDialog({
  budgetId,
  yearMonth,
  existing,
  trigger,
  open: openProp,
  onOpenChange,
}: SavingsFormDialogProps) {
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
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const createMutation = useCreateSavings();
  const updateMutation = useUpdateSavings();
  const isEditing = !!existing;

  const minDate = firstDayOfMonth(yearMonth);
  const maxDate = lastDayOfMonth(yearMonth);

  // Fill the form each time the dialog opens. Done during render (React's
  // "adjust state when a prop changes" pattern) rather than in an effect, and
  // only on the open transition, so a background refetch can't clobber typing.
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setName(existing?.name ?? "");
      setAmount(existing ? String(existing.amount) : "");
      const defaultDate = (() => {
        if (existing?.date) return existing.date;
        const today = todayISO();
        return today >= minDate && today <= maxDate ? today : minDate;
      })();
      setDate(defaultDate);
      setNotes(existing?.notes ?? "");
      setError(null);
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Name is required");
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
            name: trimmedName,
            amount: parsedAmount,
            date,
            notes: trimmedNotes,
          },
        });
      } else {
        await createMutation.mutateAsync({
          budgetId,
          name: trimmedName,
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
          <DialogTitle>{isEditing ? "Edit savings" : "Add savings"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update this savings allocation."
              : "Log money set aside this month — emergency fund, vacation, etc."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="savings-name">Purpose</Label>
            <Input
              id="savings-name"
              placeholder="e.g. Emergency fund"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="savings-amount">Amount</Label>
              <Input
                id="savings-amount"
                type="number"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min={0}
                step="0.01"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="savings-date">Date</Label>
              <Input
                id="savings-date"
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
            <Label htmlFor="savings-notes">Notes (optional)</Label>
            <Textarea
              id="savings-notes"
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
              disabled={isPending || !name.trim() || !amount}
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