import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import { usePortfolioValueHistory } from "@/queries/use-portfolio-value-history";
import { blendHistoryOverTime } from "@/lib/calculations/portfolio-history";
import { formatMoney } from "@/lib/format/money";
import { Skeleton } from "@/components/ui/skeleton";

interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ payload?: Record<string, unknown> }>;
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

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
  portfolioId: string;
  /** holding id -> currency, from the holdings the page already has loaded. */
  holdingCurrencies: Record<string, string>;
  rates: Record<string, number>;
  baseCurrency: string;
}

/**
 * Whole-portfolio value over time, blended into baseCurrency. Mirrors
 * HoldingHistoryChart's styling but sums across every holding instead of
 * showing one. Renders even for an all-baseCurrency portfolio — total
 * value over time is useful on its own, blending isn't required for that
 * case.
 */
export function PortfolioProgressionChart({
  portfolioId,
  holdingCurrencies,
  rates,
  baseCurrency,
}: Props) {
  const { data, isLoading } = usePortfolioValueHistory(portfolioId);

  if (isLoading) {
    return <Skeleton className="h-[200px] w-full" />;
  }

  const points = blendHistoryOverTime(data ?? [], holdingCurrencies, rates, baseCurrency);

  if (points.length < 2) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        Not enough history yet — update your holdings' values over time to see a trend.
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
          content={<ProgressionTooltip currency={baseCurrency} />}
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

function ProgressionTooltip({
  active,
  payload,
  currency,
}: ChartTooltipProps & { currency: string }) {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0].payload as unknown as { date: string; value: number };
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-popover-foreground shadow-md">
      <p className="text-sm font-medium">{fullDate(p.date)}</p>
      <p className="text-sm tabular-nums">{formatMoney(p.value, currency)}</p>
    </div>
  );
}
