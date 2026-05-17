import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { CategoryMonthRow } from "@/lib/calculations/aggregate-by-category-month";
import { formatMonthLabel } from "@/lib/format/year-month";

interface CategoryCompositionChartProps {
  rows: CategoryMonthRow[];
  /** All category names (chart shows all, regardless of comparison selection). */
  categories: string[];
  colors: Record<string, string>;
}

// Recharts passes active/payload/label to custom tooltip content, but the
// exported TooltipProps type no longer surfaces them. This local shape
// describes only what we read.
interface ChartTooltipProps {
  active?: boolean;
  label?: string | number;
  payload?: Array<{
    value?: number | string;
    dataKey?: string | number;
    payload?: Record<string, unknown>;
  }>;
}

/**
 * Stacked bar chart — one bar per month, each bar partitioned by category.
 * Shows the full picture of what spending was made of each month, separate
 * from the comparison chart's filtered view.
 *
 * Stacking order: largest total category at the bottom (visual anchor),
 * smaller categories stacked above. This is achieved by passing `categories`
 * (already sorted desc by total) and adding Bars in REVERSE order — Recharts
 * stacks in the order Bars are declared, with the first being bottom-most.
 */
export function CategoryCompositionChart({
  rows,
  categories,
  colors,
}: CategoryCompositionChartProps) {
  const interval =
    rows.length <= 12 ? 0 : rows.length <= 24 ? 1 : rows.length <= 48 ? 2 : 5;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium text-muted-foreground">
          Composition
        </CardTitle>
        <CardDescription>
          What your spending was made of each month.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={360}>
          <BarChart
            data={rows}
            margin={{ top: 8, right: 16, bottom: 8, left: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
            <XAxis
              dataKey="yearMonth"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12 }}
              interval={interval}
              tickFormatter={formatXAxisTick}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 12 }}
              tickFormatter={formatYAxisTick}
              domain={[0, "auto"]}
              width={64}
            />
            <Tooltip content={<CompositionTooltip colors={colors} />} cursor={{ fill: "transparent" }} />
            <Legend
              wrapperStyle={{ paddingTop: 12, fontSize: 12 }}
              iconType="circle"
              iconSize={8}
            />
            {/* Reverse so the largest category sits at the bottom of each bar. */}
            {[...categories].reverse().map((name) => (
              <Bar
                key={name}
                dataKey={name}
                stackId="spending"
                fill={colors[name]}
                radius={[0, 0, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function formatXAxisTick(yearMonth: string): string {
  const [yearStr, monthStr] = yearMonth.split("-");
  const date = new Date(Number(yearStr), Number(monthStr) - 1, 1);
  return date.toLocaleDateString(undefined, { month: "short" });
}

function formatYAxisTick(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K`;
  return amount.toString();
}

function CompositionTooltip({
  active,
  payload,
  label,
  colors,
}: ChartTooltipProps & { colors: Record<string, string> }) {
  if (!active || !payload || payload.length === 0) return null;

  // Filter out zero entries and sort by value descending.
  const entries = payload
    .filter((e) => Number(e.value) > 0)
    .sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0));

  if (entries.length === 0) return null;

  const total = entries.reduce((sum, e) => sum + (Number(e.value) || 0), 0);

  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-popover-foreground shadow-md">
      <p className="mb-1 text-sm font-medium">{formatMonthLabel(String(label))}</p>
      <ul className="space-y-1">
        {entries.map((entry) => (
          <li key={String(entry.dataKey)} className="flex items-center gap-2 text-xs">
            <span
              aria-hidden
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: colors[String(entry.dataKey)] }}
            />
            <span className="text-muted-foreground">{String(entry.dataKey)}</span>
            <span className="ml-auto tabular-nums">
              Rs{" "}
              {Number(entry.value ?? 0).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 border-t pt-1 text-xs tabular-nums">
        Total:{" "}
        <span className="font-medium">
          Rs{" "}
          {total.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
      </p>
    </div>
  );
}

