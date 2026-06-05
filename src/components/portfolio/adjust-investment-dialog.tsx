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
import { useAdjustHoldingInvestment } from "@/queries/use-holding-mutations";
import {
  applyAddInvestment,
  applyWithdrawal,
} from "@/lib/calculations/holding-investment";
import { formatMoney } from "@/lib/format/money";
import type { Holding } from "@/queries/use-holdings";

interface Props {
  holding: Holding;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AdjustInvestmentDialog({ holding, open, onOpenChange }: Props) {
  const [mode, setMode] = useState<"add" | "withdraw">("add");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const adjust = useAdjustHoldingInvestment();

  useEffect(() => {
    if (open) {
      setMode("add");
      setAmount("");
      setError(null);
    }
  }, [open]);

  const amt = Number(amount);
  const validAmount = amount.trim() !== "" && !Number.isNaN(amt) && amt > 0;
  const withdrawTooMuch =
    mode === "withdraw" && validAmount && amt > holding.current_value;

  const preview =
    validAmount && !withdrawTooMuch
      ? mode === "add"
        ? applyAddInvestment(
            holding.original_investment,
            holding.current_value,
            amt,
          )
        : applyWithdrawal(
            holding.original_investment,
            holding.current_value,
            amt,
          )
      : null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!validAmount) {
      setError("Enter an amount greater than zero");
      return;
    }
    if (withdrawTooMuch) {
      setError(
        `You can withdraw at most ${formatMoney(holding.current_value, holding.currency)}`,
      );
      return;
    }
    const result =
      mode === "add"
        ? applyAddInvestment(holding.original_investment, holding.current_value, amt)
        : applyWithdrawal(holding.original_investment, holding.current_value, amt);

    try {
      await adjust.mutateAsync({
        id: holding.id,
        portfolioId: holding.portfolio_id,
        invested: result.invested,
        currentValue: result.currentValue,
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
          <DialogTitle>Add or withdraw — {holding.name}</DialogTitle>
          <DialogDescription>
            Record money you put in or took out. Adding raises both your invested
            and current value; withdrawing lowers the value and your invested in
            step, so your gain stays the same.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={mode === "add" ? "default" : "outline"}
              className={mode === "add" ? "bg-teal-600 hover:bg-teal-700 text-white" : ""}
              onClick={() => setMode("add")}
            >
              Add
            </Button>
            <Button
              type="button"
              variant={mode === "withdraw" ? "default" : "outline"}
              className={
                mode === "withdraw" ? "bg-teal-600 hover:bg-teal-700 text-white" : ""
              }
              onClick={() => setMode("withdraw")}
            >
              Withdraw
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="adjust-amount">
              {mode === "add" ? "Amount added" : "Amount withdrawn"} ({holding.currency})
            </Label>
            <Input
              id="adjust-amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min={0}
              step="0.01"
              autoFocus
            />
          </div>

          {preview && (
            <div className="rounded-md border border-border/60 bg-muted/30 p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Invested after</span>
                <span className="tabular-nums">
                  {formatMoney(preview.invested, holding.currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Value after</span>
                <span className="tabular-nums">
                  {formatMoney(preview.currentValue, holding.currency)}
                </span>
              </div>
            </div>
          )}

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
              disabled={adjust.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-teal-600 hover:bg-teal-700 text-white"
              disabled={adjust.isPending || !validAmount || withdrawTooMuch}
            >
              {adjust.isPending ? "Saving..." : mode === "add" ? "Add" : "Withdraw"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
