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
import { formatMoney } from "@/lib/format/money";
import type { Holding } from "@/queries/use-holdings";

interface Props {
  holding: Holding;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UpdateValueDialog({ holding, open, onOpenChange }: Props) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const updateValue = useUpdateHoldingValue();

  useEffect(() => {
    if (open) {
      setValue(String(holding.current_value));
      setError(null);
    }
  }, [open, holding]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const v = Number(value);
    if (value.trim() === "" || Number.isNaN(v) || v < 0) {
      setError("Enter a non-negative number");
      return;
    }
    try {
      await updateValue.mutateAsync({
        id: holding.id,
        portfolioId: holding.portfolio_id,
        currentValue: v,
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
            What's it worth now? This changes the current value only; what you
            invested stays the same.
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
