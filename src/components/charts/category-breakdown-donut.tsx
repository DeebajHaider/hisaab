import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  type TooltipProps,
} from "recharts";
import type { CategoryBreakdownRow } from "@/lib/calculations/category-breakdown";

interface CategoryBreakdownDonutProps {
  breakdown: CategoryBreakdownRow[];
  total: number;
  colors: Record<string, string>;
}

/**
 * Donut chart of category spending — paired with the bar chart for a
 * two-read view: donut for composition at a glance, bar for precise
 * ranking. Colors match the bar chart via the shared assignCategoryColors
 * palette, so Groceries is the same color in both visualisations.
 *
 * Center of the donut shows the month total — the headline figure.
 */
export function CategoryBreakdownDonut({
  breakdown,
  total,
  colors,
}: CategoryBreakdownDonutProps) {
  return (
    <div className="relative w-full" style={{ minHeight: 240 }}>
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={breakdown}
            dataKey="total"
            nameKey="categoryName"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
            strokeWidth={0}
          >
            {breakdown.map((row) => (
              <Cell
                key={row.categoryName}
                fill={colors[row.categoryName] ?? "var(--muted-foreground)"}
              />
            ))}
          </Pie>
          <Tooltip content={<DonutTooltip />} />
        </PieChart>
      </ResponsiveContainer>

      {/* Absolute-positioned center label so it sits over the donut hole. */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Total
        </p>
        <p className="text-lg font-semibold tabular-nums">
          Rs{" "}
          {total.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </p>
      </div>
    </div>
  );
}

function DonutTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null;
  const slice = payload[0];
  const row = slice.payload as CategoryBreakdownRow;

  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-popover-foreground shadow-md">
      <p className="text-sm font-medium">{row.categoryName}</p>
      <p className="text-sm tabular-nums">
        Rs{" "}
        {row.total.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}{" "}
        <span className="text-muted-foreground">· {row.percent.toFixed(1)}%</span>
      </p>
    </div>
  );
}