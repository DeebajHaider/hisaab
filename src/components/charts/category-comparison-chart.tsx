import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CategoryMultiSelect } from "@/components/trends/category-multi-select";
import type { CategoryMonthRow } from "@/lib/calculations/aggregate-by-category-month";
import { formatMonthLabel } from "@/lib/format/year-month";

interface CategoryComparisonChartProps {
  rows: CategoryMonthRow[];
  /** All available category names, sorted by total spend desc. */
  available: string[];
  /** Currently selected category names. */
  selected: string[];
  /** Color map (name -> CSS color). */
  colors: Record<string, string>;
  onToggleCategory: (name: string) => void;
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

export function CategoryComparisonChart({
  rows,
  available,
  selected,
  colors,
  onToggleCategory,
}: CategoryComparisonChartProps) {
  // Same X-axis label thinning as MonthlyTotalsChart.
  const interval =
    rows.length <= 12 ? 0 : rows.length <= 24 ? 1 : rows.length <= 48 ? 2 : 5;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium text-muted-foreground">
          Category comparison
        </CardTitle>
        <CardDescription>
          How spending in each category trends over time.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <CategoryMultiSelect
          available={available}
          selected={selected}
          colors={colors}
          onToggle={onToggleCategory}
        />

        {selected.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Pick a category above to see its trend.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <LineChart
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
              <Tooltip content={<ComparisonTooltip colors={colors} />} cursor={{ strokeDasharray: "3 3" }} />
              {selected.map((name) => (
                <Line
                  key={name}
                  type="monotone"
                  dataKey={name}
                  stroke={colors[name]}
                  strokeWidth={2}
                  dot={{ r: 2, fill: colors[name] }}
                  activeDot={{ r: 4 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
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

function ComparisonTooltip({
  active,
  payload,
  label,
  colors,
}: ChartTooltipProps & { colors: Record<string, string> }) {
  if (!active || !payload || payload.length === 0) return null;

  // Sort entries by value desc so the largest mover is at the top
  const sorted = [...payload].sort(
    (a, b) => (Number(b.value) || 0) - (Number(a.value) || 0),
  );

  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-popover-foreground shadow-md">
      <p className="mb-1 text-sm font-medium">{formatMonthLabel(String(label))}</p>
      <ul className="space-y-1">
        {sorted.map((entry) => (
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
    </div>
  );
}

