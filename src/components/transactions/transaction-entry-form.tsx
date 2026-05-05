import { useState, useEffect, useRef, useMemo, type FormEvent } from "react";
import { Search, X, Check, Loader2 } from "lucide-react";
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
import { useCategories } from "@/queries/use-categories";
import { useItems, type ItemWithCategory } from "@/queries/use-items";
import { usePeople } from "@/queries/use-people";
import { useRecentItems } from "@/queries/use-recent-items";
import { rankItems } from "@/lib/search/rank-items";
import {
  useCreateTransaction,
  useUpdateTransaction,
} from "@/queries/use-transaction-mutations";
import type { TransactionWithRelations } from "@/queries/use-transactions";

interface TransactionEntryFormProps {
  budgetId: string;
  date: string;
  // If provided, the form is in "edit" mode — pre-filled and updates instead of creating
  existing?: TransactionWithRelations | null;
  // Called after successful save (create or update). Useful for closing a dialog in edit mode.
  onSaved?: () => void;
  // Called when the user wants to cancel an in-progress edit. Only relevant in edit mode.
  onCancel?: () => void;
}

/**
 * Self-contained form for logging a new transaction.
 *
 * Three input modes for picking an item, all kept in sync via selectedItemId:
 *   1. Search box (typing, autocomplete dropdown)
 *   2. Category dropdown + item dropdown (browse mode)
 *
 * The selected item determines:
 *   - Default mode (lump vs rate × qty)
 *   - Default rate (pre-fills the rate field)
 *   - Whether the person picker shows (depends on category.tracks_person)
 */
export function TransactionEntryForm({
  budgetId,
  date,
  existing,
  onSaved,
  onCancel,
}: TransactionEntryFormProps) {
  // --- Data
  const categoriesQuery = useCategories(budgetId);
  const itemsQuery = useItems(budgetId);
  const peopleQuery = usePeople(budgetId);
  const recentQuery = useRecentItems(budgetId);

  // --- Form state
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [mode, setMode] = useState<"lump" | "rate_qty">("lump");
  const [rate, setRate] = useState("");
  const [qty, setQty] = useState("");
  const [amount, setAmount] = useState("");
  const [personId, setPersonId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  const createMutation = useCreateTransaction();
  const updateMutation = useUpdateTransaction();

  const isEditing = !!existing;
  const mutationPending = createMutation.isPending || updateMutation.isPending;

  const searchInputRef = useRef<HTMLInputElement>(null);

  // --- Derived values
  const items = itemsQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];
  const recent = recentQuery.data ?? [];
  const people = peopleQuery.data ?? [];

  const selectedItem = useMemo(
    () => items.find((i) => i.id === selectedItemId) ?? null,
    [items, selectedItemId],
  );

  const selectedCategoryId = selectedItem?.category_id ?? null;
  const selectedCategory = useMemo(
    () =>
      selectedCategoryId
        ? categories.find((c) => c.id === selectedCategoryId) ?? null
        : null,
    [categories, selectedCategoryId],
  );

  // For the browse-mode category dropdown, we need a "currently chosen category"
  // even when no item is selected (so the user can pick a category, then pick an item).
  // We track this separately from selectedCategoryId.
  const [browseCategoryId, setBrowseCategoryId] = useState<string | null>(null);
  const effectiveCategoryId = selectedCategoryId ?? browseCategoryId;

  // Items in the currently-chosen category — the "browse" list
  const itemsInCategory = useMemo(
    () =>
      effectiveCategoryId
        ? items.filter((i) => i.category_id === effectiveCategoryId)
        : [],
    [items, effectiveCategoryId],
  );

  // Search results — only computed when search is open
  const searchResults = useMemo(
    () => rankItems({ query: searchQuery, items, recent, limit: 8 }),
    [searchQuery, items, recent],
  );

  // Pre-fill the form when entering edit mode (or when the existing transaction changes)
useEffect(() => {
  if (existing) {
    setSelectedItemId(existing.item_id);
    setMode(existing.rate !== null && existing.qty !== null ? "rate_qty" : "lump");
    setRate(existing.rate !== null ? String(existing.rate) : "");
    setQty(existing.qty !== null ? String(existing.qty) : "");
    setAmount(String(existing.amount));
    setPersonId(existing.person_id);
    setNotes(existing.notes ?? "");
    setSearchQuery("");
    setBrowseCategoryId(existing.category_id);
  }
  // We intentionally don't reset state when going from edit to create — let
  // the parent handle that by remounting the form (e.g., via key prop).
}, [existing]);

  // --- Effects: when an item is selected, apply its defaults
  useEffect(() => {
    if (!selectedItem) return;
    setMode((selectedItem.default_mode as "lump" | "rate_qty") ?? "lump");
    if (selectedItem.default_rate !== null) {
      setRate(String(selectedItem.default_rate));
    }
    setBrowseCategoryId(selectedItem.category_id);
  }, [selectedItem]);

  // --- Effects: auto-compute amount in rate_qty mode
  useEffect(() => {
    if (mode !== "rate_qty") return;
    const r = Number(rate);
    const q = Number(qty);
    if (rate.trim() === "" || qty.trim() === "" || Number.isNaN(r) || Number.isNaN(q)) {
      setAmount("");
      return;
    }
    setAmount((r * q).toFixed(2));
  }, [mode, rate, qty]);

  // --- Handlers
  const pickItem = (id: string) => {
    console.log('[pickItem] called with id:', id);
    setSelectedItemId(id);
    setSearchOpen(false);
    setSearchQuery("");
  };

  const clearItem = () => {
    setSelectedItemId(null);
    setRate("");
    setQty("");
    setAmount("");
    setPersonId(null);
  };

  const resetForm = () => {
    setSelectedItemId(null);
    setMode("lump");
    setRate("");
    setQty("");
    setAmount("");
    setPersonId(null);
    setNotes("");
    setError(null);
    // Keep the browse category — the user is likely to enter several items in a row
    // from the same category.
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedItem || !selectedCategory) {
      setError("Pick an item first");
      return;
    }

    const parsedAmount = Number(amount);
    if (amount.trim() === "" || Number.isNaN(parsedAmount) || parsedAmount < 0) {
      setError("Amount must be a non-negative number");
      return;
    }

    if (selectedCategory.tracks_person && !personId) {
      setError(`${selectedCategory.name} requires a person`);
      return;
    }

    const parsedRate =
      mode === "rate_qty" && rate.trim() !== "" ? Number(rate) : null;
    const parsedQty =
      mode === "rate_qty" && qty.trim() !== "" ? Number(qty) : null;
    const trimmedNotes = notes.trim() || null;

    try {
      if (isEditing) {
        await updateMutation.mutateAsync({
          id: existing.id,
          budgetId,
          patch: {
            categoryId: selectedCategory.id,
            itemId: selectedItem.id,
            date,
            amount: parsedAmount,
            rate: parsedRate,
            qty: parsedQty,
            personId: selectedCategory.tracks_person ? personId : null,
            notes: trimmedNotes,
          },
        });
      } else {
        await createMutation.mutateAsync({
          budgetId,
          categoryId: selectedCategory.id,
          itemId: selectedItem.id,
          date,
          amount: parsedAmount,
          rate: parsedRate,
          qty: parsedQty,
          personId: selectedCategory.tracks_person ? personId : null,
          notes: trimmedNotes,
        });
        resetForm();
        // Refocus search for rapid sequential entry — only when creating
        searchInputRef.current?.focus();
      }
      onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save");
    }
  };

  if (categoriesQuery.isLoading || itemsQuery.isLoading) {
    return <FormSkeleton />;
  }

  if (categories.length === 0 || items.length === 0) {
    return <NoSetup />;
  }

  console.log('[render] selectedItemId:', selectedItemId, 'searchQuery:', searchQuery);
  return (
    <section>
      <h2 className="text-sm font-medium text-muted-foreground mb-2 px-1">
        {isEditing ? "Edit transaction" : "Add a transaction"}
      </h2>
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-border/60 bg-card p-4 space-y-4"
    >
      {/* Search */}
      <div className="space-y-2">
        <Label htmlFor="search-input">Add items</Label>
        {/* Search */}
        <div className="space-y-2">
        <Label htmlFor="search-input">Search items</Label>
        <SearchCombobox
            items={searchResults}
            selectedId={selectedItemId}
            selectedName={selectedItem?.name ?? existing?.item?.name ?? null}
            query={searchQuery}
            onQueryChange={setSearchQuery}
            onPick={pickItem}
            onClear={clearItem}
            inputRef={searchInputRef}
        />
        </div>
      </div>

      <div className="text-xs text-muted-foreground text-center">— or browse —</div>

      {/* Category + Item dropdowns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="category-select">Category</Label>
          <Select
            value={effectiveCategoryId ?? ""}
            onValueChange={(v) => {
              setBrowseCategoryId(v);
              // If the currently selected item is not in this category, clear it
              if (selectedItem && selectedItem.category_id !== v) {
                setSelectedItemId(null);
              }
            }}
          >
            <SelectTrigger id="category-select">
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
          <Label htmlFor="item-select">Item</Label>
          <Select
            value={selectedItemId ?? ""}
            onValueChange={pickItem}
            disabled={!effectiveCategoryId}
          >
            <SelectTrigger id="item-select">
              <SelectValue
                placeholder={
                  effectiveCategoryId
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
                  {item.unit && (
                    <span className="text-muted-foreground"> · {item.unit}</span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Mode toggle */}
      <div className="flex items-center gap-2 pt-2 border-t border-border/40">
        <Label className="text-xs">Mode:</Label>
        <div className="flex rounded-md overflow-hidden border border-border/60">
          <button
            type="button"
            onClick={() => setMode("lump")}
            className={`px-3 py-1 text-xs ${
              mode === "lump"
                ? "bg-teal-600 text-white"
                : "bg-background hover:bg-muted"
            }`}
          >
            Lump
          </button>
          <button
            type="button"
            onClick={() => setMode("rate_qty")}
            className={`px-3 py-1 text-xs ${
              mode === "rate_qty"
                ? "bg-teal-600 text-white"
                : "bg-background hover:bg-muted"
            }`}
          >
            Rate × Qty
          </button>
        </div>
      </div>

      {/* Rate, Qty, Amount */}
      <div className="grid grid-cols-3 gap-3">
        {mode === "rate_qty" && (
          <>
            <div className="space-y-1">
              <Label htmlFor="rate-input" className="text-xs">Rate</Label>
              <Input
                id="rate-input"
                type="number"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                min={0}
                step="0.01"
                placeholder="0"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="qty-input" className="text-xs">
                Qty {selectedItem?.unit && `(${selectedItem.unit})`}
              </Label>
              <Input
                id="qty-input"
                type="number"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                min={0}
                step="0.001"
                placeholder="0"
              />
            </div>
          </>
        )}
        <div
          className={`space-y-1 ${
            mode === "rate_qty" ? "" : "col-span-3"
          }`}
        >
          <Label htmlFor="amount-input" className="text-xs">
            Amount
          </Label>
          <Input
            id="amount-input"
            type="number"
            value={amount}
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

      {/* Person picker — only when category requires it */}
      {selectedCategory?.tracks_person && (
        <div className="space-y-2">
          <Label htmlFor="person-select">Person</Label>
          <Select
            value={personId ?? ""}
            onValueChange={setPersonId}
          >
            <SelectTrigger id="person-select">
              <SelectValue placeholder="Pick a person" />
            </SelectTrigger>
            <SelectContent>
              {people.length === 0 && (
                <div className="px-2 py-3 text-xs text-muted-foreground">
                  No people defined for this budget. Add some in Manage.
                </div>
              )}
              {people.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes-input" className="text-xs">
          Notes (optional)
        </Label>
        <Textarea
          id="notes-input"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder=""
          className="text-sm"
        />
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2 pt-2 border-t border-border/40">
        {isEditing ? (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={mutationPending}
          >
            Cancel
          </Button>
        ) : (
          <Button
            type="button"
            variant="ghost"
            onClick={resetForm}
            disabled={mutationPending}
          >
            Reset
          </Button>
        )}
        <Button
          type="submit"
          className="bg-teal-600 hover:bg-teal-700 text-white"
          disabled={
            mutationPending ||
            !selectedItem ||
            !amount.trim() ||
            (selectedCategory?.tracks_person && !personId)
          }
        >
          {mutationPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : isEditing ? (
            "Save changes"
          ) : (
            "Save & next"
          )}
        </Button>
      </div>
    </form>
  </section>
  );
}

// ----------------------------------------------------------------------------
// Search dropdown content
// ----------------------------------------------------------------------------
function SearchDropdown({
  results,
  selectedId,
  onPick,
}: {
  results: ItemWithCategory[];
  selectedId: string | null;
  onPick: (id: string) => void;
}) {
  if (results.length === 0) {
    return (
      <div className="px-3 py-4 text-sm text-muted-foreground text-center">
        No matching items.
      </div>
    );
  }

  return (
    <div className="max-h-72 overflow-y-auto py-1">
      {results.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onPick(item.id)}
          className={`w-full text-left px-3 py-1.5 text-sm hover:bg-muted/60 flex items-center gap-2 ${
            item.id === selectedId ? "bg-muted/40" : ""
          }`}
        >
          <span className="font-medium truncate">{item.name}</span>
          <span className="text-xs text-muted-foreground truncate">
            {item.category?.name}
            {item.unit && ` · ${item.unit}`}
          </span>
          {item.id === selectedId && (
            <Check className="w-3.5 h-3.5 ml-auto text-teal-600 dark:text-teal-400" />
          )}
        </button>
      ))}
    </div>
  );
}

// ----------------------------------------------------------------------------
// SearchCombobox — custom search input with keyboard-navigable dropdown
// Built without Popover to avoid click-outside flicker and have full control
// over focus + keyboard.
// ----------------------------------------------------------------------------
function SearchCombobox({
  items,
  selectedId,
  selectedName,
  query,
  onQueryChange,
  onPick,
  onClear,
  inputRef,
}: {
  items: ItemWithCategory[];
  selectedId: string | null;
  selectedName: string | null;
  query: string;
  onQueryChange: (q: string) => void;
  onPick: (id: string) => void;
  onClear: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const [open, setOpen] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Reset highlight when results change
  useEffect(() => {
    setHighlightIdx(0);
  }, [items]);

  // Close when clicking outside the container
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // The display value: when an item is selected and the user hasn't started a
  // new query, show the selected name. Otherwise show what they're typing.
  const displayValue = query !== "" ? query : selectedName ?? "";

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHighlightIdx((idx) => Math.min(idx + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      setHighlightIdx((idx) => Math.max(idx - 1, 0));
    } else if (e.key === "Enter") {
      if (open && items[highlightIdx]) {
        e.preventDefault();
        onPick(items[highlightIdx].id);
        setOpen(false);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  // Keep the highlighted row visible when navigating with keys
  useEffect(() => {
    if (!open || !listRef.current) return;
    const highlighted = listRef.current.querySelector<HTMLElement>(
      `[data-idx="${highlightIdx}"]`,
    );
    highlighted?.scrollIntoView({ block: "nearest" });
  }, [highlightIdx, open]);

  return (
    <div ref={containerRef} className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      <Input
        ref={inputRef}
        id="search-input"
        placeholder="Type to search..."
        value={displayValue}
        onChange={(e) => {
          onQueryChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        className="pl-9 pr-9"
        autoComplete="off"
      />
      {selectedId && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClear();
            inputRef.current?.focus();
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label="Clear selection"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {open && (
        <div
          ref={listRef}
          className="absolute top-full left-0 right-0 mt-1 z-50 max-h-72 overflow-y-auto rounded-md border border-border/60 bg-popover shadow-md py-1"
        >
          {items.length === 0 ? (
            <div className="px-3 py-4 text-sm text-muted-foreground text-center">
              No matching items.
            </div>
          ) : (
            items.map((item, idx) => (
              <button
                key={item.id}
                type="button"
                data-idx={idx}
                // Use onMouseDown rather than onClick so the click registers
                // before the input's blur fires.
                onMouseDown={(e) => {
                  e.preventDefault();
                  onPick(item.id);
                  setOpen(false);
                }}
                onMouseEnter={() => setHighlightIdx(idx)}
                className={`w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 ${
                  idx === highlightIdx ? "bg-muted/60" : "hover:bg-muted/40"
                }`}
              >
                <span className="font-medium truncate">{item.name}</span>
                <span className="text-xs text-muted-foreground truncate">
                  {item.category?.name}
                  {item.unit && ` · ${item.unit}`}
                </span>
                {item.id === selectedId && (
                  <Check className="w-3.5 h-3.5 ml-auto text-teal-600 dark:text-teal-400" />
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function FormSkeleton() {
  return (
    <div className="rounded-lg border border-border/60 bg-card p-4 space-y-4">
      <div className="h-9 bg-muted/40 rounded animate-pulse" />
      <div className="grid grid-cols-2 gap-3">
        <div className="h-9 bg-muted/40 rounded animate-pulse" />
        <div className="h-9 bg-muted/40 rounded animate-pulse" />
      </div>
      <div className="h-9 bg-muted/40 rounded animate-pulse" />
    </div>
  );
}

function NoSetup() {
  return (
    <div className="rounded-lg border border-dashed border-border p-8 text-center">
      <p className="text-sm text-muted-foreground">
        Set up some categories and items first in Manage.
      </p>
    </div>
  );
}