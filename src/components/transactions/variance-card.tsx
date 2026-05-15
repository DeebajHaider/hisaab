import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { calculateVariance } from "@/lib/calculations/variance";

interface VarianceCardProps {
  income: number;
  expenses: number;
  savings: number;
}

/**
 * The "did I come out ahead this month?" card.
 *
 * Variance = income - expenses - savings.
 * Three visual states: surplus (positive, teal), deficit (negative, red),
 * balanced (zero, muted). The math is broken out underneath so the user
 * can see exactly how the number was arrived at.
 */
export function VarianceCard({ income, expenses, savings }: VarianceCardProps) {
  const variance = calculateVariance({ income, expenses, savings });

  const status = variance > 0 ? "surplus" : variance < 0 ? "deficit" : "balanced";

  const statusConfig = {
    surplus: {
      label: "Surplus",
      colorClass: "text-teal-600 dark:text-teal-400",
      Icon: TrendingUp,
    },
    deficit: {
      label: "Deficit",
      colorClass: "text-destructive",
      Icon: TrendingDown,
    },
    balanced: {
      label: "Balanced",
      colorClass: "text-muted-foreground",
      Icon: Minus,
    },
  }[status];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium text-muted-foreground">
          This month
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3">
          <statusConfig.Icon className={`h-8 w-8 ${statusConfig.colorClass}`} />
          <div>
            <p className={`text-3xl font-semibold tabular-nums ${statusConfig.colorClass}`}>
              {variance > 0 ? "+" : variance < 0 ? "−" : ""}
              {formatAmount(Math.abs(variance))}
            </p>
            <p className={`text-sm ${statusConfig.colorClass}`}>
              {statusConfig.label}
            </p>
          </div>
        </div>

        <div className="border-t pt-3">
          <div className="grid grid-cols-1 gap-2 text-center text-sm sm:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Income
              </p>
              <p className="mt-1 font-medium tabular-nums">{formatAmount(income)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Expenses
              </p>
              <p className="mt-1 font-medium tabular-nums">−{formatAmount(expenses)}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Savings
              </p>
              <p className="mt-1 font-medium tabular-nums">−{formatAmount(savings)}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function formatAmount(amount: number): string {
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}