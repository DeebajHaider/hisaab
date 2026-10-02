import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { FilterChips } from "@/components/shared/filter-chips";
import { LEDGER_PRESETS, type LedgerPreset } from "@/lib/calculations/resolve-ledger-preset";
import { cn } from "@/lib/utils";
import type { Category } from "@/queries/use-categories";
import type { ItemWithCategory } from "@/queries/use-items";

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

  return (
    <div className="space-y-4 rounded-lg border border-border/60 bg-card p-4">
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
    </div>
  );
}
