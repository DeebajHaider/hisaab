import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  type TooltipProps,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CategoryBreakdownRow } from "@/lib/calculations/category-breakdown";

interface CategoryBreakdownChartProps {
  breakdown: CategoryBreakdownRow[];
}

/**
 * Horizontal bar chart showing spending per category for a single month.
 * Each bar is labeled with the category name and percent share of the total;
 * hover shows the precise amount.
 *
 * Horizontal layout chosen because category names can be long (e.g.,
 * "Pocket Money", "Doctor visits") and vertical bars would force rotation
 * or truncation. Height scales with the number of categories so the bars
 * stay readable regardless of how many we have.
 */
export function CategoryBreakdownChart({ breakdown }: CategoryBreakdownChartProps) {
  // Defensive: parent should gate on length > 0, but don't crash if not.
  if (breakdown.length === 0) {
    return null;
  }

  // ~40px per bar plus padding for axis and chart margins.
  const chartHeight = breakdown.length * 40 + 40;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium text-muted-foreground">
          Spending by category
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart
            data={breakdown}
            layout="vertical"
            margin={{ top: 8, right: 56, bottom: 8, left: 8 }}
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
            <Bar
              dataKey="total"
              fill="var(--color-teal-600)"
              radius={[0, 4, 4, 0]}
              label={<PercentLabel />}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

/**
 * Renders the percent share as a label just outside the right edge of each bar.
 * Recharts passes geometry (x, y, width, height) plus the data row to label
 * components — we extract the percent and place it.
 */
function PercentLabel(props: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  value?: number;
  index?: number;
  // The data row is passed when you use a custom label component; typed loosely
  // because Recharts' types are inexact here.
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

/**
 * Tooltip shown on hover. Renders the category name, amount, and percent
 * in a small popover styled to match the rest of the app.
 */
function BreakdownTooltip({
  active,
  payload,
}: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0].payload as CategoryBreakdownRow;

  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-popover-foreground shadow-md">
      <p className="text-sm font-medium">{row.categoryName}</p>
      <p className="text-sm tabular-nums">
        {row.total.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}{" "}
        <span className="text-muted-foreground">· {row.percent.toFixed(1)}%</span>
      </p>
    </div>
  );
}

