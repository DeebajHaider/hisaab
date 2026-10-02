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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCreateItem,
  useUpdateItem,
} from "@/queries/use-item-mutations";
import type { Category } from "@/queries/use-categories";
import type { ItemWithCategory } from "@/queries/use-items";

interface ItemFormDialogProps {
  budgetId: string;
  // Available categories to pick from
  categories: Category[];
  // Pre-selected category (e.g., when "Add item" is clicked under a specific category)
  defaultCategoryId?: string;
  // If provided, dialog is in "edit" mode
  existing?: ItemWithCategory;
  trigger: ReactNode;
}

export function ItemFormDialog({
  budgetId,
  categories,
  defaultCategoryId,
  existing,
  trigger,
}: ItemFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [unit, setUnit] = useState("");
  const [defaultRate, setDefaultRate] = useState("");
  const [defaultMode, setDefaultMode] = useState<"lump" | "rate_qty">("lump");
  const [error, setError] = useState<string | null>(null);

  const createMutation = useCreateItem();
  const updateMutation = useUpdateItem();
  const isEditing = !!existing;

  // Depends on `open` alone, not `existing`/`categories` — a background
  // refetch of either list (triggered by any sibling mutation) would
  // otherwise re-fire this mid-edit and clobber whatever the user has
  // typed, since react-query hands back new object/array references on
  // every refetch even when the content is unchanged.
  useEffect(() => {
    if (open) {
      setName(existing?.name ?? "");
      setCategoryId(
        existing?.category_id ?? defaultCategoryId ?? categories[0]?.id ?? "",
      );
      setUnit(existing?.unit ?? "");
      setDefaultRate(
        existing?.default_rate !== null && existing?.default_rate !== undefined
          ? String(existing.default_rate)
          : "",
      );
      setDefaultMode((existing?.default_mode as "lump" | "rate_qty") ?? "lump");
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Name is required");
      return;
    }
    if (!categoryId) {
      setError("Pick a category");
      return;
    }

    // Parse default rate — empty means null, otherwise must be a non-negative number
    let parsedRate: number | null = null;
    const rateTrimmed = defaultRate.trim();
    if (rateTrimmed !== "") {
      const parsed = Number(rateTrimmed);
      if (Number.isNaN(parsed) || parsed < 0) {
        setError("Default rate must be a non-negative number");
        return;
      }
      parsedRate = parsed;
    }

    const trimmedUnit = unit.trim() || null;

    try {
      if (isEditing) {
        await updateMutation.mutateAsync({
          id: existing.id,
          budgetId,
          patch: {
            name: trimmedName,
            categoryId,
            unit: trimmedUnit,
            defaultRate: parsedRate,
            defaultMode,
          },
        });
      } else {
        await createMutation.mutateAsync({
          budgetId,
          categoryId,
          name: trimmedName,
          unit: trimmedUnit,
          defaultRate: parsedRate,
          defaultMode,
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
          <DialogTitle>{isEditing ? "Edit item" : "New item"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update this item's details."
              : "Items are the things you actually log, like Flour or Petrol."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="item-name">Name</Label>
            <Input
              id="item-name"
              placeholder="e.g. Flour"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="item-category">Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger id="item-category">
                <SelectValue placeholder="Pick a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="item-unit">Unit (optional)</Label>
              <Input
                id="item-unit"
                placeholder="Kg, Ltr, Each..."
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                maxLength={20}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-rate">Default rate (optional)</Label>
              <Input
                id="item-rate"
                type="number"
                placeholder="180"
                value={defaultRate}
                onChange={(e) => setDefaultRate(e.target.value)}
                min={0}
                step="0.01"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="item-mode">Default entry mode</Label>
            <Select
              value={defaultMode}
              onValueChange={(v) => setDefaultMode(v as "lump" | "rate_qty")}
            >
              <SelectTrigger id="item-mode">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lump">
                  Lump sum (single amount)
                </SelectItem>
                <SelectItem value="rate_qty">
                  Rate × Quantity (e.g., 180 × 2 Kg)
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              How the entry form opens by default for this item. You can switch when logging.
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
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-accent-solid hover:bg-accent-solid-hover text-white"
              disabled={isPending || !name.trim() || !categoryId}
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