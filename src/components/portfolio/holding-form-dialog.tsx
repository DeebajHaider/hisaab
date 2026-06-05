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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCreateHolding,
  useUpdateHolding,
} from "@/queries/use-holding-mutations";
import { todayISO } from "@/lib/format/date";
import type { AssetClass } from "@/queries/use-asset-classes";
import type { Holding } from "@/queries/use-holdings";

const CURRENCIES = ["PKR", "USD", "EUR", "GBP", "AED", "SAR"];

interface HoldingFormDialogProps {
  portfolioId: string;
  assetClasses: AssetClass[];
  defaultAssetClassId?: string;
  existing?: Holding;
  // Uncontrolled (create button): pass trigger.
  trigger?: ReactNode;
  // Controlled (edit from the row menu): pass open + onOpenChange.
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function HoldingFormDialog({
  portfolioId,
  assetClasses,
  defaultAssetClassId,
  existing,
  trigger,
  open: openProp,
  onOpenChange,
}: HoldingFormDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const [name, setName] = useState("");
  const [ticker, setTicker] = useState("");
  const [assetClassId, setAssetClassId] = useState("");
  const [currency, setCurrency] = useState("PKR");
  const [originalInvestment, setOriginalInvestment] = useState("");
  const [currentValue, setCurrentValue] = useState(""); // create only
  const [asOf, setAsOf] = useState(todayISO()); // create only
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const createMutation = useCreateHolding();
  const updateMutation = useUpdateHolding();
  const isEditing = !!existing;
  const today = todayISO();

  useEffect(() => {
    if (open) {
      setName(existing?.name ?? "");
      setTicker(existing?.ticker ?? "");
      setAssetClassId(
        existing?.asset_class_id ?? defaultAssetClassId ?? assetClasses[0]?.id ?? "",
      );
      setCurrency(existing?.currency ?? "PKR");
      setOriginalInvestment(existing ? String(existing.original_investment) : "");
      setCurrentValue("");
      setAsOf(today);
      setNotes(existing?.notes ?? "");
      setError(null);
    }
  }, [open, existing, defaultAssetClassId, assetClasses, today]);

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Name is required");
      return;
    }
    if (!assetClassId) {
      setError("Pick an asset class");
      return;
    }

    const orig = Number(originalInvestment);
    if (originalInvestment.trim() === "" || Number.isNaN(orig) || orig < 0) {
      setError("Enter what you invested (a non-negative number)");
      return;
    }

    try {
      if (isEditing) {
        await updateMutation.mutateAsync({
          id: existing.id,
          portfolioId,
          assetClassId,
          name: trimmedName,
          ticker: ticker.trim() || null,
          currency,
          originalInvestment: orig,
          notes: notes.trim() || null,
        });
      } else {
        let cur = orig;
        if (currentValue.trim() !== "") {
          const parsed = Number(currentValue);
          if (Number.isNaN(parsed) || parsed < 0) {
            setError("Current value must be a non-negative number");
            return;
          }
          cur = parsed;
        }
        if (asOf > today) {
          setError("The date can't be in the future");
          return;
        }
        await createMutation.mutateAsync({
          portfolioId,
          assetClassId,
          name: trimmedName,
          ticker: ticker.trim() || null,
          currency,
          originalInvestment: orig,
          currentValue: cur,
          asOf,
          notes: notes.trim() || null,
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
          <DialogTitle>{isEditing ? "Edit details" : "New holding"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update this holding's labels. To change what it's worth, use Update value; to record money in or out, use Add or withdraw."
              : "Something you own — a stock, fund, property, or anything else."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="holding-name">Name</Label>
            <Input
              id="holding-name"
              placeholder="e.g. HUBCO"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="holding-ticker">Ticker (optional)</Label>
              <Input
                id="holding-ticker"
                placeholder="HUBC"
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
                maxLength={20}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="holding-currency">Currency</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger id="holding-currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="holding-class">Asset class</Label>
            <Select value={assetClassId} onValueChange={setAssetClassId}>
              <SelectTrigger id="holding-class">
                <SelectValue placeholder="Pick an asset class" />
              </SelectTrigger>
              <SelectContent>
                {assetClasses.map((ac) => (
                  <SelectItem key={ac.id} value={ac.id}>
                    {ac.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="holding-invested">
                {isEditing ? "Amount invested (your cost)" : "Invested"}
              </Label>
              <Input
                id="holding-invested"
                type="number"
                placeholder="25000"
                value={originalInvestment}
                onChange={(e) => setOriginalInvestment(e.target.value)}
                min={0}
                step="0.01"
                required
              />
              {isEditing && (
                <p className="text-xs text-muted-foreground">
                  Only change this to fix a mis-entry.
                </p>
              )}
            </div>
            {!isEditing && (
              <div className="space-y-2">
                <Label htmlFor="holding-current">Current value</Label>
                <Input
                  id="holding-current"
                  type="number"
                  placeholder="Same as invested"
                  value={currentValue}
                  onChange={(e) => setCurrentValue(e.target.value)}
                  min={0}
                  step="0.01"
                />
              </div>
            )}
          </div>

          {!isEditing && (
            <div className="space-y-2">
              <Label htmlFor="holding-date">As of date</Label>
              <Input
                id="holding-date"
                type="date"
                value={asOf}
                max={today}
                onChange={(e) => setAsOf(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                When this value is from. Back-date it to when you actually started
                this holding.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="holding-notes">Notes (optional)</Label>
            <Textarea
              id="holding-notes"
              placeholder="Anything worth remembering"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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
              className="bg-teal-600 hover:bg-teal-700 text-white"
              disabled={isPending || !name.trim() || !assetClassId}
            >
              {isPending
                ? isEditing
                  ? "Saving..."
                  : "Creating..."
                : isEditing
                  ? "Save"
                  : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}