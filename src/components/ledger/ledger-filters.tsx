import { useMemo } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { FilterChips } from "@/components/shared/filter-chips";
import { LEDGER_PRESETS, type LedgerPreset } from "@/lib/calculations/resolve-ledger-preset";
import { cn } from "@/lib/utils";
import type { Category } from "@/queries/use-categories";
import type { ItemWithCategory } from "@/queries/use-items";
import type { Person } from "@/queries/use-people";

const PRESET_LABELS: Record<LedgerPreset, string> = {
  "this-month": "This month",
  "this-year": "This year",
  "last-12-months": "Last 12 months",
  "all-time": "All time",
};

interface LedgerFiltersProps {
  from: string;
  to: string;
  onFromChange: (iso: string) => void;
  onToChange: (iso: string) => void;
  activePreset: LedgerPreset | null;
  onPresetSelect: (preset: LedgerPreset) => void;
  categories: Category[];
  selectedCategoryIds: string[];
  onToggleCategory: (id: string) => void;
  items: ItemWithCategory[];
  selectedItemIds: string[];
  onToggleItem: (id: string) => void;
  people: Person[];
  selectedPersonIds: string[];
  onTogglePerson: (id: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
  /** Shown only when something other than the date range is filtered. */
  onClearFilters?: () => void;
}

/**
 * All Ledger filter controls: date-range presets + always-editable From/To
 * pickers (so a preset is just a starting point — the user can drag the
 * range to anything, e.g. July→June for a tax year), plus category and
 * item chip filters.
 */
export function LedgerFilters({
  from,
  to,
  onFromChange,
  onToChange,
  activePreset,
  onPresetSelect,
  categories,
  selectedCategoryIds,
  onToggleCategory,
  items,
  selectedItemIds,
  onToggleItem,
  people,
  selectedPersonIds,
  onTogglePerson,
  search,
  onSearchChange,
  onClearFilters,
}: LedgerFiltersProps) {
  const categoryOptions = useMemo(
    () => categories.map((c) => ({ id: c.id, label: c.name })),
    [categories],
  );

  // When one or more categories are selected, scope the item chips to
  // those categories — same cascading relationship the entry form's
  // browse mode already uses. With no category selected, show every item.
  const itemOptions = useMemo(() => {
    const selectedSet = new Set(selectedCategoryIds);
    const pool =
      selectedSet.size === 0
        ? items
        : items.filter((i) => selectedSet.has(i.category_id));
    return pool.map((i) => ({ id: i.id, label: i.name }));
  }, [items, selectedCategoryIds]);

  const personOptions = useMemo(
    () => people.map((p) => ({ id: p.id, label: p.is_archived ? `${p.name} (archived)` : p.name })),
    [people],
  );

  return (
    <div className="space-y-4 rounded-lg glass p-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search notes…"
          aria-label="Search notes"
          autoComplete="off"
          className="pl-9 pr-9 [&::-webkit-search-cancel-button]:hidden"
        />
        {search && (
          <button
            type="button"
            onClick={() => onSearchChange("")}
            aria-label="Clear search"
            className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap rounded-md border bg-muted p-1">
          {LEDGER_PRESETS.map((preset) => {
            const isActive = preset === activePreset;
            return (
              <Button
                key={preset}
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onPresetSelect(preset)}
                className={cn(
                  "h-7 rounded px-3 text-xs font-medium",
                  isActive
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {PRESET_LABELS[preset]}
              </Button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">From</Label>
          <DatePicker value={from} onChange={onFromChange} ariaLabel="From date" />
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">To</Label>
          <DatePicker value={to} onChange={onToChange} ariaLabel="To date" />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Categories</Label>
        <FilterChips
          options={categoryOptions}
          selected={selectedCategoryIds}
          onToggle={onToggleCategory}
          emptyLabel="No categories set up yet."
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Items</Label>
        <FilterChips
          options={itemOptions}
          selected={selectedItemIds}
          onToggle={onToggleItem}
          emptyLabel="No items in the selected categories."
        />
      </div>

      {people.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">People</Label>
          <FilterChips
            options={personOptions}
            selected={selectedPersonIds}
            onToggle={onTogglePerson}
            emptyLabel=""
          />
        </div>
      )}

      {onClearFilters && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClearFilters}
          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <X className="mr-1 h-3.5 w-3.5" />
          Clear filters
        </Button>
      )}
    </div>
  );
}
