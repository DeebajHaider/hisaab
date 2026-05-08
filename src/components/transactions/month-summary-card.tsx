import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MonthSummary } from "@/lib/calculations/month-summary";
import { formatMonthLabel, type YearMonth } from "@/lib/format/year-month";

interface MonthSummaryCardProps {
  yearMonth: YearMonth;
  summary: MonthSummary;
}

/**
 * Headline numbers for a given month: total, transaction count, average
 * per day, largest category, and per-person totals (only shown when
 * tracked-category data exists).
 *
 * Stays presentational — calculation lives in calculateMonthSummary.
 */
export function MonthSummaryCard({ yearMonth, summary }: MonthSummaryCardProps) {
  const {
    totalExpenses,
    transactionCount,
    averagePerDay,
    largestCategory,
    perPerson,
  } = summary;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium text-muted-foreground">
          {formatMonthLabel(yearMonth)} summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Headline number — total spending */}
        <div>
          <p className="text-sm text-muted-foreground">Total spent</p>
          <p className="text-3xl font-semibold tabular-nums">
            {formatAmount(totalExpenses)}
          </p>
        </div>

        {/* Three secondary stats in a responsive grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Stat
            label="Average per day"
            value={formatAmount(averagePerDay)}
          />
          <Stat
            label="Transactions"
            value={transactionCount.toLocaleString()}
          />
          <Stat
            label="Largest category"
            value={
              largestCategory
                ? `${largestCategory.name} · ${formatAmount(largestCategory.total)}`
                : "—"
            }
          />
        </div>

        {/* Per-person breakdown — only when tracked categories were used */}
        {perPerson.length > 0 && (
          <div className="border-t pt-4">
            <p className="mb-3 text-sm font-medium text-muted-foreground">
              By person
            </p>
            <ul className="space-y-1">
              {perPerson.map((p) => (
                <li
                  key={p.name}
                  className="flex items-center justify-between text-sm"
                >
                  <span className={p.name === "Unassigned" ? "italic text-muted-foreground" : ""}>
                    {p.name}
                  </span>
                  <span className="tabular-nums">{formatAmount(p.total)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-lg font-medium tabular-nums">{value}</p>
    </div>
  );
}

/**
 * Locale-aware money formatter. Matches the day view's inline pattern;
 * promote to a shared helper once a third caller appears.
 */
function formatAmount(amount: number): string {
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}