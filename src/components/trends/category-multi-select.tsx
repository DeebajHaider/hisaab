import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CategoryMultiSelectProps {
  /** All available category names. */
  available: string[];
  /** Currently selected category names. */
  selected: string[];
  /** Color map (category name -> CSS color value). */
  colors: Record<string, string>;
  onToggle: (categoryName: string) => void;
}

/**
 * Horizontal scrollable strip of toggleable chips. Each chip shows a
 * color dot matching the line's color in the comparison chart.
 *
 * Selected chips are filled with subtle background; unselected are
 * outlined. Click toggles. Acts as a built-in legend.
 */
export function CategoryMultiSelect({
  available,
  selected,
  colors,
  onToggle,
}: CategoryMultiSelectProps) {
  const selectedSet = new Set(selected);

  return (
    <div className="flex flex-wrap gap-1.5">
      {available.map((name) => {
        const isSelected = selectedSet.has(name);
        const color = colors[name] ?? "var(--muted-foreground)";

        return (
          <button
            key={name}
            type="button"
            onClick={() => onToggle(name)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors",
              isSelected
                ? "border-foreground/20 bg-accent text-foreground"
                : "border-border text-muted-foreground hover:bg-muted",
            )}
          >
            <span
              aria-hidden
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: isSelected ? color : "transparent", borderColor: color, borderWidth: 1.5 }}
            />
            <span>{name}</span>
            {isSelected && <Check className="h-3 w-3" aria-hidden />}
          </button>
        );
      })}
    </div>
  );
}
