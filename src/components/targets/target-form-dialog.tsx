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
import { DatePicker } from "@/components/ui/date-picker";
import { FilterChips } from "@/components/shared/filter-chips";
import { useCreateTarget, useUpdateTarget } from "@/queries/use-target-mutations";
import {
  resolveTargetPreset,
  TARGET_PRESETS,
  type TargetPreset,
} from "@/lib/calculations/resolve-target-preset";
import { todayISO } from "@/lib/format/date";
import { cn } from "@/lib/utils";
import type { Category } from "@/queries/use-categories";
import type { ItemWithCategory } from "@/queries/use-items";
import type { Target } from "@/queries/use-targets";

const PRESET_LABELS: Record<TargetPreset, string> = {
  "this-week": "This week",
  "this-month": "This month",
};

interface TargetFormDialogProps {
  budgetId: string;
  categories: Category[];
  items: ItemWithCategory[];
  existing?: Target;
  trigger: ReactNode;
}

export function TargetFormDialog({
  budgetId,
  categories,
  items,
  existing,
  trigger,
}: TargetFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState(todayISO());
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [itemIds, setItemIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const createMutation = useCreateTarget();
  const updateMutation = useUpdateTarget();
  const isEditing = !!existing;
  const isPending = createMutation.isPending || updateMutation.isPending;

  // Depends on `open` alone, not `existing`/`categories`/`items` — a
  // background refetch of any of those (triggered by any sibling mutation)
  // would otherwise re-fire this mid-edit and clobber whatever the user has
  // typed, since react-query hands back new object/array references on
  // every refetch even when the content is unchanged.
  // Fill the form each time the dialog opens. Done during render (React's
  // "adjust state when a prop changes" pattern) rather than in an effect, and
  // only on the open transition, so a background refetch can't clobber typing.
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setName(existing?.name ?? "");
      setAmount(existing ? String(existing.target_amount) : "");
      setStartDate(existing?.start_date ?? todayISO());
      setEndDate(existing?.end_date ?? todayISO());
      setCategoryIds(existing?.category_ids ?? []);
      setItemIds(existing?.item_ids ?? []);
      setError(null);
    }
  }

  const handlePresetSelect = (preset: TargetPreset) => {
    const range = resolveTargetPreset(preset, todayISO());
    setStartDate(range.start);
    setEndDate(range.end);
  };

  const categoryOptions = categories.map((c) => ({ id: c.id, label: c.name }));
  const itemOptions = items.map((i) => ({ id: i.id, label: i.name }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Name is required");
      return;
    }

    const parsedAmount = Number(amount);
    if (amount.trim() === "" || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      setError("Target amount must be a positive number");
      return;
    }

    if (endDate < startDate) {
      setError("End date can't be before the start date");
      return;
    }

    if (categoryIds.length === 0 && itemIds.length === 0) {
      setError("Pick at least one category or item to track");
      return;
    }

    try {
      if (isEditing) {
        await updateMutation.mutateAsync({
          id: existing.id,
          budgetId,
          patch: {
            name: trimmedName,
            targetAmount: parsedAmount,
            startDate,
            endDate,
            categoryIds,
            itemIds,
          },
        });
      } else {
        await createMutation.mutateAsync({
          budgetId,
          name: trimmedName,
          targetAmount: parsedAmount,
          startDate,
          endDate,
          categoryIds,
          itemIds,
        });
      }
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit target" : "New target"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update this spending target."
              : "A spending goal for any mix of categories and items, over any date range."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="target-name">Name</Label>
            <Input
              id="target-name"
              placeholder="e.g. Food"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="target-amount">Target amount</Label>
            <Input
              id="target-amount"
              type="number"
              inputMode="decimal"
              placeholder="4000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min={0}
              step="0.01"
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Period</Label>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex rounded-md border bg-muted p-1">
                {TARGET_PRESETS.map((preset) => (
                  <Button
                    key={preset}
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePresetSelect(preset)}
                    className={cn("h-7 rounded px-3 text-xs font-medium text-muted-foreground hover:text-foreground")}
                  >
                    {PRESET_LABELS[preset]}
                  </Button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <DatePicker value={startDate} onChange={setStartDate} ariaLabel="Start date" />
                <span className="text-xs text-muted-foreground">to</span>
                <DatePicker value={endDate} onChange={setEndDate} ariaLabel="End date" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Track categories</Label>
            <FilterChips
              options={categoryOptions}
              selected={categoryIds}
              onToggle={(id) =>
                setCategoryIds((ids) => (ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id]))
              }
              emptyLabel="No categories set up yet."
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">
              Track items (from any category — mix freely)
            </Label>
            <FilterChips
              options={itemOptions}
              selected={itemIds}
              onToggle={(id) =>
                setItemIds((ids) => (ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id]))
              }
              emptyLabel="No items set up yet."
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
              disabled={isPending || !name.trim() || !amount.trim()}
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
