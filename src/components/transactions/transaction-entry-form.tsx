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
import { DatePicker } from "@/components/ui/date-picker";
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
  /** Date in create mode is fixed by the route. In edit mode, this is the
   *  initial date — the user can change it via the date picker. */
  date: string;
  existing?: TransactionWithRelations | null;
  onSaved?: () => void;
  onCancel?: () => void;
}

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
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  // The date being edited. Only meaningful in edit mode — in create mode the
  // route's date is used at submit time. Initialized in the pre-fill effect.
  const [editingDate, setEditingDate] = useState<string>(date);

  const [browseCategoryId, setBrowseCategoryId] = useState<string | null>(null);

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

  const selectedCategoryId =
    selectedItem?.category_id ?? browseCategoryId ?? existing?.category_id ?? null;

  const selectedCategory = useMemo(() => {
    if (!selectedCategoryId) return null;
    const fromList = categories.find((c) => c.id === selectedCategoryId) ?? null;
    if (fromList) return fromList;
    if (existing?.category && existing.category.id === selectedCategoryId) {
      return existing.category as unknown as (typeof categories)[number];
    }
    return null;
  }, [categories, selectedCategoryId, existing]);

  const effectiveCategoryId = selectedCategoryId;

  const itemsInCategory = useMemo(
    () =>
      effectiveCategoryId
        ? items.filter((i) => i.category_id === effectiveCategoryId)
        : [],
    [items, effectiveCategoryId],
  );

  const searchResults = useMemo(
    () => rankItems({ query: searchQuery, items, recent, limit: 8 }),
    [searchQuery, items, recent],
  );

  // --- People for the picker (5.5 fix)
  // usePeople returns only ACTIVE people. If the transaction being edited is
  // assigned to a person who has since been archived, that person wouldn't
  // appear in the list, so the dropdown couldn't show them as the current
  // assignee. peopleForPicker augments the active list with the existing
  // assignee when they're archived, marking them visibly so it's clear.
  //
  // Important: the archived person is shown ONLY because they're the current
  // assignee — they're not a freely-pickable option. The submit button check
  // below blocks switching FROM the original archived assignee to a different
  // archived person, since other archived people are filtered out of the list.
  // This preserves data fidelity (the existing assignment is shown) without
  // undermining archive hygiene (you can't reassign to an archived person).
  const peopleForPicker = useMemo(() => {
    const list = people.map((p) => ({ ...p, isArchivedAssignee: false }));
    const existingPersonId = existing?.person_id ?? null;
    if (!existingPersonId) return list;
    // Already in the active list? Nothing to do.
    if (list.some((p) => p.id === existingPersonId)) return list;
    // The existing assignee isn't active. Use the embedded person on the
    // transaction (joined by useTransactions) to display them.
    const archivedAssignee = existing?.person;
    if (!archivedAssignee) return list;
    return [
      ...list,
      {
        id: archivedAssignee.id,
        name: archivedAssignee.name,
        isArchivedAssignee: true,
      },
    ];
  }, [people, existing]);

  // For the SelectValue children fallback — resolved person to display on
  // the trigger, regardless of whether the dropdown content has been mounted.
  const selectedPerson = useMemo(
    () => peopleForPicker.find((p) => p.id === personId) ?? null,
    [peopleForPicker, personId],
  );

  // --- Edit-mode pre-fill
  useEffect(() => {
    if (existing) {
      setSelectedItemId(existing.item_id);
      setMode(
        existing.rate !== null && existing.qty !== null ? "rate_qty" : "lump",
      );
      setRate(existing.rate !== null ? String(existing.rate) : "");
      setQty(existing.qty !== null ? String(existing.qty) : "");
      setAmount(String(existing.amount));
      setPersonId(existing.person_id);
      setNotes(existing.notes ?? "");
      setSearchQuery("");
      setBrowseCategoryId(existing.category_id);
      setEditingDate(existing.date);
    }
  }, [existing]);

  // --- Auto-compute amount in rate_qty mode
  useEffect(() => {
    if (mode !== "rate_qty") return;
    const r = Number(rate);
    const q = Number(qty);
    if (
      rate.trim() === "" ||
      qty.trim() === "" ||
      Number.isNaN(r) ||
      Number.isNaN(q)
    ) {
      setAmount("");
      return;
    }
    setAmount((r * q).toFixed(2));
  }, [mode, rate, qty]);

  // --- Handlers
  const pickItem = (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;

    setSelectedItemId(id);
    setSearchQuery("");
    setBrowseCategoryId(item.category_id);

    // Applying the new item's defaults (mode, rate, and clearing qty/amount)
    // only makes sense for a fresh entry. In edit mode, the user is
    // correcting which item/category an existing transaction belongs to —
    // the price they already entered shouldn't silently vanish just
    // because they changed the item.
    if (isEditing) return;

    const itemMode = (item.default_mode as "lump" | "rate_qty") ?? "lump";
    setMode(itemMode);
    if (item.default_rate !== null) {
      setRate(String(item.default_rate));
    } else {
      setRate("");
    }

    setQty("");
    setAmount("");
  };

  const clearItem = () => {
    setSelectedItemId(null);

    // Same reasoning as pickItem: clearing the item to re-search for a
    // replacement shouldn't wipe a price already entered while editing.
    if (isEditing) return;

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
    setSearchQuery("");
  };

  // Strict YYYY-MM-DD check, used in edit mode only. Mirrors the importer's
  // validity rule: not just well-formed, but a real calendar date.
  const isRealISODate = (s: string) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (!m) return false;
    const [y, mo, d] = m.slice(1).map(Number);
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return false;
    const dt = new Date(y, mo - 1, d);
    return dt.getFullYear() === y && dt.getMonth() === mo - 1 && dt.getDate() === d;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedItem || !selectedCategory) {
      setError("Pick an item first");
      return;
    }

    const parsedAmount = Number(amount);
    if (
      amount.trim() === "" ||
      Number.isNaN(parsedAmount) ||
      parsedAmount < 0
    ) {
      setError("Amount must be a non-negative number");
      return;
    }

    if (selectedCategory.tracks_person && !personId) {
      setError(`${selectedCategory.name} requires a person`);
      return;
    }

    // Edit mode: the date may have been changed via the picker. Validate it.
    if (isEditing && !isRealISODate(editingDate)) {
      setError("Pick a valid date");
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
            date: editingDate,
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

  return (
    <section>
      <h2 className="text-sm font-medium text-muted-foreground mb-3 px-1">
        {isEditing ? "Edit transaction" : "Add a transaction"}
      </h2>
      <form
        onSubmit={handleSubmit}
        className="rounded-lg glass p-5 sm:p-6 space-y-5"
      >
        {/* Date — edit mode only. */}
        {isEditing && (
          <div className="space-y-2">
            <Label>Date</Label>
            <DatePicker
              value={editingDate}
              onChange={setEditingDate}
              ariaLabel="Change date"
            />
          </div>
        )}

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

        <div className="text-xs text-muted-foreground text-center">
          — or browse —
        </div>

        {/* Category + Item dropdowns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="category-select">Category</Label>
            <Select
              value={effectiveCategoryId ?? ""}
              onValueChange={(v) => {
                setBrowseCategoryId(v);
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
                >
                  {selectedItem?.name}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {itemsInCategory.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                    {item.unit && (
                      <span className="text-muted-foreground">
                        {" "}
                        · {item.unit}
                      </span>
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
                  ? "bg-accent-solid text-white"
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
                  ? "bg-accent-solid text-white"
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
                <Label htmlFor="rate-input" className="text-xs">
                  Rate
                </Label>
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
            className={`space-y-1 ${mode === "rate_qty" ? "" : "col-span-3"}`}
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

        {/* Person picker — only when category requires it. The 5.5 fix:
            SelectValue children fallback so the trigger shows the assignee
            even before the SelectContent has mounted, and peopleForPicker
            so an archived current-assignee remains visible. */}
        {selectedCategory?.tracks_person && (
          <div className="space-y-2">
            <Label htmlFor="person-select">Person</Label>
            <Select
              // Remounting on personId changes forces Radix to re-match its
              // internal SelectItem lookup. Without this, when the form pre-fills
              // personId in an effect AFTER the Select has mounted with value="",
              // the trigger can stay blank because Radix's mount-time lookup ran
              // against the empty value.
              key={`person-${personId ?? "none"}`}
              value={personId ?? ""}
              onValueChange={setPersonId}
            >
              <SelectTrigger id="person-select">
                <SelectValue placeholder="Pick a person">
                  {selectedPerson && (
                    <span>
                      {selectedPerson.name}
                      {selectedPerson.isArchivedAssignee && (
                        <span className="text-muted-foreground text-xs ml-1">
                          (archived)
                        </span>
                      )}
                    </span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {peopleForPicker.length === 0 && (
                  <div className="px-2 py-3 text-xs text-muted-foreground">
                    No people defined for this budget. Add some in Manage.
                  </div>
                )}
                {peopleForPicker.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                    {p.isArchivedAssignee && (
                      <span className="text-muted-foreground text-xs">
                        {" "}· archived
                      </span>
                    )}
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
            className="bg-accent-solid hover:bg-accent-solid-hover text-white"
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
// SearchCombobox — custom search input with keyboard-navigable dropdown
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

  useEffect(() => {
    setHighlightIdx(0);
  }, [items]);

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
        onKeyDown={handleKeyDown}
        // Dropdown items pick via onMouseDown + preventDefault (see below),
        // so a real click never reaches here as a blur — this only closes
        // the dropdown when focus actually leaves (e.g. tabbing away),
        // which otherwise left it open and stale for keyboard users.
        onBlur={() => setOpen(false)}
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
                  <Check className="w-3.5 h-3.5 ml-auto text-accent-text" />
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
    <div className="rounded-lg glass p-4 space-y-4">
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

