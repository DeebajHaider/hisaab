import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FilterChipOption {
  id: string;
  label: string;
}

interface FilterChipsProps {
  options: FilterChipOption[];
  selected: string[];
  onToggle: (id: string) => void;
  emptyLabel?: string;
}

/**
 * Horizontal wrap of toggleable chips, keyed by id rather than name (unlike
 * CategoryMultiSelect in components/trends, which keys by category name —
 * fine there since it's chart-legend driven, but features that filter or
 * track by category_id/item_id directly need id-keying, and item names can
 * collide across categories). No selection means "no filter" — all options
 * are implicitly included. Shared between the Ledger's filters and the
 * Targets form's category/item pickers.
 */
export function FilterChips({
  options,
  selected,
  onToggle,
  emptyLabel = "None available",
}: FilterChipsProps) {
  if (options.length === 0) {
    return <p className="text-xs text-muted-foreground">{emptyLabel}</p>;
  }

  const selectedSet = new Set(selected);

  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => {
        const isSelected = selectedSet.has(option.id);
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onToggle(option.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors",
              isSelected
                ? "border-foreground/20 bg-accent text-foreground"
                : "border-border text-muted-foreground hover:bg-muted",
            )}
          >
            <span>{option.label}</span>
            {isSelected && <Check className="h-3 w-3" aria-hidden />}
          </button>
        );
      })}
    </div>
  );
}
