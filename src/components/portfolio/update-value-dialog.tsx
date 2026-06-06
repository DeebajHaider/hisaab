import { useState, useEffect, type FormEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUpdateHoldingValue } from "@/queries/use-holding-mutations";
import { useHoldingHistory } from "@/queries/use-holding-history";
import { formatMoney } from "@/lib/format/money";
import { todayISO } from "@/lib/format/date";
import type { Holding } from "@/queries/use-holdings";

interface Props {
  holding: Holding;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UpdateValueDialog({ holding, open, onOpenChange }: Props) {
  const [value, setValue] = useState("");
  const [asOf, setAsOf] = useState(todayISO());
  const [error, setError] = useState<string | null>(null);
  const updateValue = useUpdateHoldingValue();

  // Only fetch history while the dialog is open (passing undefined disables it),
  // so the holdings list doesn't fire a query per row.
  const { data: history } = useHoldingHistory(open ? holding.id : undefined);

  const today = todayISO();
  // Floor = the holding's earliest recorded date; no floor until history loads.
  const minDate =
    history && history.length > 0 ? history[0].as_of : undefined;

  useEffect(() => {
    if (open) {
      setValue(String(holding.current_value));
      setAsOf(today);
      setError(null);
    }
  }, [open, holding, today]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const v = Number(value);
    if (value.trim() === "" || Number.isNaN(v) || v < 0) {
      setError("Enter a non-negative number");
      return;
    }
    if (asOf > today) {
      setError("Can't record a future date");
      return;
    }
    if (minDate && asOf < minDate) {
      setError(`Pick a date on or after ${minDate} (when this holding starts)`);
      return;
    }

    // Newest point on/after the current value's date becomes the headline value.
    const latestAsOf = (holding.current_value_at ?? "").slice(0, 10);
    const setAsCurrent = !latestAsOf || asOf >= latestAsOf;

    try {
      await updateValue.mutateAsync({
        id: holding.id,
        portfolioId: holding.portfolio_id,
        currentValue: v,
        asOf,
        setAsCurrent,
      });
      onOpenChange(false);
    } catch {
      // onError toast already fired
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Update value — {holding.name}</DialogTitle>
          <DialogDescription>
            What's it worth, and as of when? This changes the current value only;
            what you invested stays the same.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="update-value">Current value</Label>
            <Input
              id="update-value"
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              min={0}
              step="0.01"
              autoFocus
            />
            <p className="text-xs text-muted-foreground">
              You invested {formatMoney(holding.original_investment, holding.currency)}.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="update-date">As of date</Label>
            <Input
              id="update-date"
              type="date"
              value={asOf}
              min={minDate}
              max={today}
              onChange={(e) => setAsOf(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Defaults to today. Pick an earlier date to fill in history.
            </p>
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
              onClick={() => onOpenChange(false)}
              disabled={updateValue.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-teal-600 hover:bg-teal-700 text-white"
              disabled={updateValue.isPending}
            >
              {updateValue.isPending ? "Saving..." : "Save value"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
