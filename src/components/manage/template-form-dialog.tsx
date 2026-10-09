import { useState, useMemo, type FormEvent, type ReactNode } from "react";
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
import { useCreateTemplate, useUpdateTemplate } from "@/queries/use-template-mutations";
import { usePeople } from "@/queries/use-people";
import type { Category } from "@/queries/use-categories";
import type { ItemWithCategory } from "@/queries/use-items";
import type { TemplateWithRelations } from "@/queries/use-templates";

interface TemplateFormDialogProps {
  budgetId: string;
  categories: Category[];
  items: ItemWithCategory[];
  existing?: TemplateWithRelations;
  trigger: ReactNode;
}

export function TemplateFormDialog({
  budgetId,
  categories,
  items,
  existing,
  trigger,
}: TemplateFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [itemId, setItemId] = useState("");
  const [label, setLabel] = useState("");
  const [mode, setMode] = useState<"lump" | "rate_qty">("lump");
  const [rate, setRate] = useState("");
  const [qty, setQty] = useState("");
  const [amount, setAmount] = useState("");
  const [personId, setPersonId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const peopleQuery = usePeople(budgetId);
  const people = peopleQuery.data ?? [];

  const createMutation = useCreateTemplate();
  const updateMutation = useUpdateTemplate();
  const isEditing = !!existing;
  const isPending = createMutation.isPending || updateMutation.isPending;

  const itemsInCategory = useMemo(
    () => (categoryId ? items.filter((i) => i.category_id === categoryId) : []),
    [items, categoryId],
  );

  const selectedCategory = categories.find((c) => c.id === categoryId) ?? null;
  const selectedItem = items.find((i) => i.id === itemId) ?? null;

  // Depends on `open` alone, not `existing`/`categories` — a background
  // refetch of either list (triggered by any sibling mutation) would
  // otherwise re-fire this mid-edit and clobber whatever the user has
  // typed, since react-query hands back new object/array references on
  // every refetch even when the content is unchanged.
  // Fill the form each time the dialog opens. Done during render (React's
  // "adjust state when a prop changes" pattern) rather than in an effect, and
  // only on the open transition, so a background refetch can't clobber typing.
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setCategoryId(existing?.category_id ?? categories[0]?.id ?? "");
      setItemId(existing?.item_id ?? "");
      setLabel(existing?.label ?? "");
      setMode(existing?.rate !== null && existing?.rate !== undefined ? "rate_qty" : "lump");
      setRate(existing?.rate !== null && existing?.rate !== undefined ? String(existing.rate) : "");
      setQty(existing?.qty !== null && existing?.qty !== undefined ? String(existing.qty) : "");
      setAmount(existing ? String(existing.amount) : "");
      setPersonId(existing?.person_id ?? null);
      setNotes(existing?.notes ?? "");
      setError(null);
    }
  }

  // In rate x qty mode the amount is derived, same as the transaction entry
  // form; in lump mode it is whatever was typed.
  const computedAmount = (() => {
    const r = Number(rate);
    const q = Number(qty);
    if (rate.trim() === "" || qty.trim() === "" || Number.isNaN(r) || Number.isNaN(q)) return "";
    return (r * q).toFixed(2);
  })();
  const effectiveAmount = mode === "rate_qty" ? computedAmount : amount;

  // Changing category drops an item that belongs to the old one.
  const handleCategoryChange = (next: string) => {
    setCategoryId(next);
    if (selectedItem && selectedItem.category_id !== next) setItemId("");
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!categoryId) {
      setError("Pick a category");
      return;
    }
    if (!itemId) {
      setError("Pick an item");
      return;
    }

    const parsedAmount = Number(effectiveAmount);
    if (effectiveAmount.trim() === "" || Number.isNaN(parsedAmount) || parsedAmount < 0) {
      setError("Amount must be a non-negative number");
      return;
    }

    if (selectedCategory?.tracks_person && !personId) {
      setError(`${selectedCategory.name} requires a person`);
      return;
    }

    const parsedRate = mode === "rate_qty" && rate.trim() !== "" ? Number(rate) : null;
    const parsedQty = mode === "rate_qty" && qty.trim() !== "" ? Number(qty) : null;
    const trimmedLabel = label.trim() || null;
    const trimmedNotes = notes.trim() || null;

    try {
      if (isEditing) {
        await updateMutation.mutateAsync({
          id: existing.id,
          budgetId,
          patch: {
            categoryId,
            itemId,
            label: trimmedLabel,
            amount: parsedAmount,
            rate: parsedRate,
            qty: parsedQty,
            personId: selectedCategory?.tracks_person ? personId : null,
            notes: trimmedNotes,
          },
        });
      } else {
        await createMutation.mutateAsync({
          budgetId,
          categoryId,
          itemId,
          label: trimmedLabel,
          amount: parsedAmount,
          rate: parsedRate,
          qty: parsedQty,
          personId: selectedCategory?.tracks_person ? personId : null,
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
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit template" : "New template"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update this quick-add template."
              : "A saved transaction you can add with one click from the Day view."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="template-category">Category</Label>
              <Select value={categoryId} onValueChange={handleCategoryChange}>
                <SelectTrigger id="template-category">
                  <SelectValue placeholder="Pick a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-item">Item</Label>
              <Select value={itemId} onValueChange={setItemId} disabled={!categoryId}>
                <SelectTrigger id="template-item">
                  <SelectValue
                    placeholder={
                      categoryId
                        ? itemsInCategory.length === 0
                          ? "No items in this category"
                          : "Pick an item"
                        : "Pick a category first"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {itemsInCategory.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="template-label">Label (optional)</Label>
            <Input
              id="template-label"
              placeholder={selectedItem?.name ?? "e.g. Netflix"}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground">
              Shown on the quick-add button instead of the item name. Leave blank to just use
              the item name.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Label className="text-xs">Mode:</Label>
            <div className="flex rounded-md overflow-hidden border border-border/60">
              <button
                type="button"
                onClick={() => setMode("lump")}
                className={`px-3 py-1 text-xs ${
                  mode === "lump" ? "bg-accent-solid text-white" : "bg-background hover:bg-muted"
                }`}
              >
                Lump
              </button>
              <button
                type="button"
                onClick={() => setMode("rate_qty")}
                className={`px-3 py-1 text-xs ${
                  mode === "rate_qty"
                    ? "bg-accent-solid text-white"
                    : "bg-background hover:bg-muted"
                }`}
              >
                Rate × Qty
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {mode === "rate_qty" && (
              <>
                <div className="space-y-1">
                  <Label htmlFor="template-rate" className="text-xs">
                    Rate
                  </Label>
                  <Input
                    id="template-rate"
                    type="number"
                    inputMode="decimal"
                    value={rate}
                    onChange={(e) => setRate(e.target.value)}
                    min={0}
                    step="0.01"
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="template-qty" className="text-xs">
                    Qty {selectedItem?.unit && `(${selectedItem.unit})`}
                  </Label>
                  <Input
                    id="template-qty"
                    type="number"
                    inputMode="decimal"
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    min={0}
                    step="0.001"
                    placeholder="0"
                  />
                </div>
              </>
            )}
            <div className={`space-y-1 ${mode === "rate_qty" ? "" : "col-span-3"}`}>
              <Label htmlFor="template-amount" className="text-xs">
                Amount
              </Label>
              <Input
                id="template-amount"
                type="number"
                inputMode="decimal"
                value={effectiveAmount}
                onChange={(e) => setAmount(e.target.value)}
                min={0}
                step="0.01"
                placeholder="0.00"
                readOnly={mode === "rate_qty"}
                className={mode === "rate_qty" ? "bg-muted/50" : ""}
                required
              />
            </div>
          </div>

          {selectedCategory?.tracks_person && (
            <div className="space-y-2">
              <Label htmlFor="template-person">Person</Label>
              <Select value={personId ?? ""} onValueChange={setPersonId}>
                <SelectTrigger id="template-person">
                  <SelectValue placeholder="Pick a person" />
                </SelectTrigger>
                <SelectContent>
                  {people.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="template-notes" className="text-xs">
              Notes (optional)
            </Label>
            <Textarea
              id="template-notes"
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
              className="bg-accent-solid hover:bg-accent-solid-hover text-white"
              disabled={isPending || !categoryId || !itemId || !effectiveAmount.trim()}
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
