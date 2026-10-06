import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { CategoryBreakdownRow } from "@/lib/calculations/category-breakdown";

interface CategoryBreakdownChartProps {
  breakdown: CategoryBreakdownRow[];
  /** Color map (category name -> CSS color) — shared with the donut. */
  colors: Record<string, string>;
  /** When given, category names become links that call this with the name. */
  onSelect?: (categoryName: string) => void;
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
  onSelect,
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
        margin={{ top: 8, right: 48, bottom: 8, left: 8 }}
      >
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="categoryName"
          tickLine={false}
          axisLine={false}
          width={80}
          tick={onSelect ? <LinkTick onSelect={onSelect} /> : { fontSize: 13 }}
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

/** A Y-axis label that acts as a link (keyboard- and click-activatable). */
function LinkTick(props: {
  x?: number;
  y?: number;
  payload?: { value: string };
  onSelect: (name: string) => void;
}) {
  const { x = 0, y = 0, payload, onSelect } = props;
  if (!payload) return null;
  const activate = () => onSelect(payload.value);

  return (
    <text
      x={x}
      y={y}
      dy={4}
      textAnchor="end"
      fontSize={13}
      role="link"
      tabIndex={0}
      aria-label={`${payload.value}: view transactions in the Ledger`}
      className="cursor-pointer fill-foreground hover:underline focus-visible:underline focus-visible:outline-none"
      onClick={activate}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          activate();
        }
      }}
    >
      {payload.value}
    </text>
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

function BreakdownTooltip({ active, payload }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0].payload as unknown as CategoryBreakdownRow;

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