import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { formatMoney } from "@/lib/format/money";

export interface AllocationSlice {
  name: string; // asset class name
  value: number; // base-currency value
  percent: number;
}

// Recharts no longer surfaces payload on the exported TooltipProps; describe
// just what we read (same workaround as the Phase 3 charts).
interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ payload?: Record<string, unknown> }>;
}

interface Props {
  slices: AllocationSlice[];
  colors: Record<string, string>;
  baseCurrency: string;
}

/**
 * Allocation donut with a legend beside it. Deliberately has NO center label —
 * the month-view donut put the total in the hole, where the hover tooltip
 * covered it. Here the totals live in their own cards, the hole stays clean,
 * and the legend gives exact values and shares without needing the tooltip.
 */
export function AllocationDonut({ slices, colors, baseCurrency }: Props) {
  if (slices.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No values to allocate yet.</p>
    );
  }

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
      <div className="w-full lg:w-[280px] shrink-0">
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="name"
              innerRadius={62}
              outerRadius={100}
              paddingAngle={2}
              strokeWidth={0}
            >
              {slices.map((s) => (
                <Cell
                  key={s.name}
                  fill={colors[s.name] ?? "var(--muted-foreground)"}
                />
              ))}
            </Pie>
            <Tooltip content={<DonutTooltip baseCurrency={baseCurrency} />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <ul className="flex-1 space-y-2">
        {slices.map((s) => (
          <li key={s.name} className="flex items-center gap-3 text-sm">
            <span
              className="h-3 w-3 shrink-0 rounded-sm"
              style={{ backgroundColor: colors[s.name] ?? "var(--muted-foreground)" }}
            />
            <span className="truncate">{s.name}</span>
            <span className="ml-auto tabular-nums text-muted-foreground">
              {formatMoney(s.value, baseCurrency)}
            </span>
            <span className="w-16 text-right tabular-nums font-medium">
              {s.percent.toFixed(1)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DonutTooltip({
  active,
  payload,
  baseCurrency,
}: ChartTooltipProps & { baseCurrency: string }) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0].payload as unknown as AllocationSlice;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-popover-foreground shadow-md">
      <p className="text-sm font-medium">{row.name}</p>
      <p className="text-sm tabular-nums">
        {formatMoney(row.value, baseCurrency)}{" "}
        <span className="text-muted-foreground">· {row.percent.toFixed(1)}%</span>
      </p>
    </div>
  );
}
