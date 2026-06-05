import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { useHoldingHistory } from "@/queries/use-holding-history";
import {
  collapseHistoryByDay,
  type DailyValuePoint,
} from "@/lib/format/collapse-history";
import { formatMoney } from "@/lib/format/money";
import { Skeleton } from "@/components/ui/skeleton";

// Same shape workaround as your bar/donut charts — Recharts' exported
// TooltipProps no longer surfaces payload.
interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ payload?: Record<string, unknown> }>;
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// Timezone-safe formatters: parse the YYYY-MM-DD parts directly, never new Date.
function shortDate(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]}`;
}
function fullDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}
function compactNumber(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(abs % 1_000_000 === 0 ? 0 : 1) + "M";
  if (abs >= 1_000) return (n / 1_000).toFixed(abs % 1_000 === 0 ? 0 : 1) + "k";
  return String(Math.round(n));
}

interface Props {
  holdingId: string;
  currency: string;
}

export function HoldingHistoryChart({ holdingId, currency }: Props) {
  const { data, isLoading } = useHoldingHistory(holdingId);

  if (isLoading) {
    return <Skeleton className="h-[200px] w-full" />;
  }

  const points = collapseHistoryByDay(data ?? []);

  if (points.length < 2) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        Not enough history yet — update its value over time to see a trend.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={points} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={shortDate}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
          minTickGap={24}
        />
        <YAxis
          tickFormatter={compactNumber}
          tickLine={false}
          axisLine={false}
          width={56}
          tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
        />
        <Tooltip
          content={<HistoryTooltip currency={currency} />}
          cursor={{ stroke: "var(--border)" }}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke="var(--chart-1)"
          strokeWidth={2}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

function HistoryTooltip({
  active,
  payload,
  currency,
}: ChartTooltipProps & { currency: string }) {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0].payload as unknown as DailyValuePoint;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-popover-foreground shadow-md">
      <p className="text-sm font-medium">{fullDate(p.date)}</p>
      <p className="text-sm tabular-nums">{formatMoney(p.value, currency)}</p>
    </div>
  );
}