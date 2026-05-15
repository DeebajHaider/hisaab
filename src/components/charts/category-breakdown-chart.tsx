import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  type TooltipProps,
} from "recharts";
import type { CategoryBreakdownRow } from "@/lib/calculations/category-breakdown";

interface CategoryBreakdownChartProps {
  breakdown: CategoryBreakdownRow[];
  /** Color map (category name -> CSS color) — shared with the donut. */
  colors: Record<string, string>;
}

/**
 * Horizontal bar chart showing spending per category for a single month.
 * Bars are colored per category using the shared palette so colors stay
 * consistent with the donut chart beside it and the trends page.
 *
 * Each bar is labeled with the category name (on the Y axis) and its
 * percent share (to the right of the bar). Hover shows the precise amount.
 */
export function CategoryBreakdownChart({
  breakdown,
  colors,
}: CategoryBreakdownChartProps) {
  if (breakdown.length === 0) {
    return null;
  }

  const chartHeight = breakdown.length * 40 + 40;

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart
        data={breakdown}
        layout="vertical"
        margin={{ top: 8, right: 64, bottom: 8, left: 8 }}
      >
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="categoryName"
          tickLine={false}
          axisLine={false}
          width={120}
          tick={{ fontSize: 13 }}
        />
        <Tooltip content={<BreakdownTooltip />} cursor={{ fill: "transparent" }} />
        <Bar dataKey="total" radius={[0, 4, 4, 0]} label={<PercentLabel />}>
          {breakdown.map((row) => (
            <Cell
              key={row.categoryName}
              fill={colors[row.categoryName] ?? "var(--muted-foreground)"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function PercentLabel(props: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: CategoryBreakdownRow;
}) {
  const { x = 0, y = 0, width = 0, height = 0, payload } = props;
  if (!payload) return null;

  return (
    <text
      x={x + width + 6}
      y={y + height / 2}
      dy={4}
      fill="currentColor"
      className="fill-muted-foreground text-xs tabular-nums"
    >
      {payload.percent.toFixed(1)}%
    </text>
  );
}

function BreakdownTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0].payload as CategoryBreakdownRow;

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