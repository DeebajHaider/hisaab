import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MonthlyTotal } from "@/lib/calculations/aggregate-by-month";
import { formatMonthLabel } from "@/lib/format/year-month";

interface MonthlyTotalsChartProps {
  data: MonthlyTotal[];
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
 * Line chart of total spending per month over a chosen timeframe.
 * Y axis is anchored at 0 to avoid the misleading impression of dramatic
 * variation that auto-scaling can give. X axis labels are thinned out
 * automatically based on the number of points.
 */
export function MonthlyTotalsChart({ data }: MonthlyTotalsChartProps) {
  // Choose how many X-axis labels to skip based on data density.
  // ≤12 points: all labels. 13-24: every 2nd. 25-48: every 3rd. >48: every 6th.
  const interval =
    data.length <= 12
      ? 0
      : data.length <= 24
        ? 1
        : data.length <= 48
          ? 2
          : 5;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium text-muted-foreground">
          Total spending
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <LineChart
            data={data}
            margin={{ top: 8, right: 16, bottom: 8, left: 8 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              className="stroke-border"
            />
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
              tickFormatter={(v: number) => formatYAxisTick(v)}
              domain={[0, "auto"]}
              width={64}
            />
            <Tooltip content={<TrendTooltip />} cursor={{ strokeDasharray: "3 3" }} />
            <Line
              type="monotone"
              dataKey="total"
              stroke="var(--color-teal-600)"
              strokeWidth={2}
              dot={{ r: 3, fill: "var(--color-teal-600)" }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

/**
 * X-axis tick formatter — turn "2026-05" into "May" or "May '26"
 * depending on whether we're crossing year boundaries. Keep it short;
 * full month names crowd quickly.
 */
function formatXAxisTick(yearMonth: string): string {
  // Short month name. e.g. "2026-05" -> "May"
  const [yearStr, monthStr] = yearMonth.split("-");
  const date = new Date(Number(yearStr), Number(monthStr) - 1, 1);
  return date.toLocaleDateString(undefined, { month: "short" });
}

/**
 * Y-axis tick formatter — compact Rs values.
 * 1000 -> 1K, 1500000 -> 1.5M. Keeps the axis from getting wide.
 */
function formatYAxisTick(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K`;
  return amount.toString();
}

function TrendTooltip({ active, payload }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0].payload as unknown as MonthlyTotal;

  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-popover-foreground shadow-md">
      <p className="text-sm font-medium">{formatMonthLabel(row.yearMonth)}</p>
      <p className="text-sm tabular-nums">
        Rs{" "}
        {row.total.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </p>
    </div>
  );
}

