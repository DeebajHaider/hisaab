import { Link } from "react-router-dom";
import type { DayGroup } from "@/lib/calculations/group-by-day";
import type { TransactionWithRelations } from "@/queries/use-transactions";
import { formatDayLabel } from "@/lib/format/date";

interface LedgerDayGroupProps {
  budgetId: string;
  group: DayGroup;
  currency: string;
}

function formatAmount(amount: number): string {
  return amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * One day's worth of ledger rows: a header (date + day subtotal) and the
 * transactions underneath, bank-statement style. Read-only — each row
 * links back to the Day view where it can actually be edited or deleted,
 * so the Ledger doesn't need to duplicate that mutation UI.
 */
export function LedgerDayGroup({ budgetId, group, currency }: LedgerDayGroupProps) {
  return (
    <div className="rounded-lg border border-border/60 bg-card overflow-hidden">
      <Link
        to={`/app/budgets/${budgetId}/day/${group.date}`}
        className="flex items-center justify-between px-3 py-2 border-b border-border/40 bg-muted/30 hover:bg-muted/50 transition-colors"
      >
        <span className="font-medium text-sm">{formatDayLabel(group.date)}</span>
        <span className="text-sm tabular-nums text-muted-foreground">
          {currency} {formatAmount(group.subtotal)}
        </span>
      </Link>
      <ul className="divide-y divide-border/30">
        {group.transactions.map((tx) => (
          <LedgerRow key={tx.id} budgetId={budgetId} transaction={tx} currency={currency} />
        ))}
      </ul>
    </div>
  );
}

function LedgerRow({
  budgetId,
  transaction,
  currency,
}: {
  budgetId: string;
  transaction: TransactionWithRelations;
  currency: string;
}) {
  return (
    <li>
      <Link
        to={`/app/budgets/${budgetId}/day/${transaction.date}`}
        className="px-3 py-2 flex items-center gap-3 hover:bg-muted/20 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-sm font-medium truncate">
              {transaction.item?.name ?? "Unknown item"}
            </span>
            <span className="text-xs text-muted-foreground">
              · {transaction.category?.name ?? "Uncategorized"}
            </span>
            {transaction.person && (
              <span className="text-xs text-muted-foreground">
                · {transaction.person.name}
              </span>
            )}
          </div>
          {transaction.notes && (
            <div className="text-xs text-muted-foreground mt-0.5 truncate">
              {transaction.notes}
            </div>
          )}
        </div>

        <div className="text-sm font-medium tabular-nums shrink-0">
          {currency} {formatAmount(transaction.amount)}
        </div>
      </Link>
    </li>
  );
}
