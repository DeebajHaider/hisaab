import { Button } from "@/components/ui/button";
import { TIMEFRAMES, type Timeframe } from "@/lib/calculations/resolve-timeframe";
import { cn } from "@/lib/utils";

interface TimeframeSelectorProps {
  value: Timeframe;
  onChange: (value: Timeframe) => void;
}

/**
 * Segmented control for picking a trends timeframe.
 * Stock-chart style — 1M / 3M / 6M / 1Y / 3Y / 5Y / All.
 *
 * Selected button gets the teal accent; unselected stay neutral.
 */
export function TimeframeSelector({ value, onChange }: TimeframeSelectorProps) {
  return (
    <div className="inline-flex rounded-md border bg-muted p-1">
      {TIMEFRAMES.map((tf) => {
        const isActive = tf === value;
        return (
          <Button
            key={tf}
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(tf)}
            className={cn(
              "h-7 rounded px-3 text-xs font-medium tabular-nums",
              isActive
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tf}
          </Button>
        );
      })}
    </div>
  );
}

