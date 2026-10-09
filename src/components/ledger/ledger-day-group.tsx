import { Link } from "react-router-dom";
import type { DayGroup } from "@/lib/calculations/group-by-day";
import type { TransactionWithRelations } from "@/queries/use-transactions";
import { formatDayLabel } from "@/lib/format/date";
import { TagChips } from "@/components/transactions/tag-chips";

export interface LedgerSelection {
  selected: ReadonlySet<string>;
  onToggle: (id: string) => void;
  onToggleGroup: (ids: string[]) => void;
}

interface LedgerDayGroupProps {
  budgetId: string;
  group: DayGroup;
  currency: string;
  /** When given, rows become selectable instead of linking to the Day view. */
  selection?: LedgerSelection;
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
export function LedgerDayGroup({ budgetId, group, currency, selection }: LedgerDayGroupProps) {
  const headerClass =
    "flex items-center justify-between px-3 py-2 border-b border-border/40 bg-muted/30 hover:bg-muted/50 transition-colors";
  const ids = group.transactions.map((t) => t.id);
  const selectedCount = selection ? ids.filter((id) => selection.selected.has(id)).length : 0;

  const heading = (
    <>
      <span className="font-medium text-sm">{formatDayLabel(group.date)}</span>
      <span className="text-sm tabular-nums text-muted-foreground">
        {currency} {formatAmount(group.subtotal)}
      </span>
    </>
  );

  return (
    <div className="rounded-lg glass overflow-hidden">
      {selection ? (
        <label className={`${headerClass} cursor-pointer gap-3`}>
          <input
            type="checkbox"
            className="h-4 w-4 shrink-0 accent-[var(--accent-solid)]"
            checked={selectedCount === ids.length}
            ref={(el) => {
              if (el) el.indeterminate = selectedCount > 0 && selectedCount < ids.length;
            }}
            onChange={() => selection.onToggleGroup(ids)}
            aria-label={`Select all on ${formatDayLabel(group.date)}`}
          />
          <span className="flex flex-1 items-center justify-between">{heading}</span>
        </label>
      ) : (
        <Link to={`/app/budgets/${budgetId}/day/${group.date}`} className={headerClass}>
          {heading}
        </Link>
      )}
      <ul className="divide-y divide-border/30">
        {group.transactions.map((tx) => (
          <LedgerRow
            key={tx.id}
            budgetId={budgetId}
            transaction={tx}
            currency={currency}
            selection={selection}
          />
        ))}
      </ul>
    </div>
  );
}

function LedgerRow({
  budgetId,
  transaction,
  currency,
  selection,
}: {
  budgetId: string;
  transaction: TransactionWithRelations;
  currency: string;
  selection?: LedgerSelection;
}) {
  const rowClass = "px-3 py-2 flex items-center gap-3 hover:bg-muted/20 transition-colors";
  const body = (
    <>
      {selection && (
        <input
          type="checkbox"
          className="h-4 w-4 shrink-0 accent-[var(--accent-solid)]"
          checked={selection.selected.has(transaction.id)}
          onChange={() => selection.onToggle(transaction.id)}
          aria-label={`Select ${transaction.item?.name ?? "transaction"}`}
        />
      )}
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
          <TagChips tags={transaction.tags} />
        </div>

        <div className="text-sm font-medium tabular-nums shrink-0">
          {currency} {formatAmount(transaction.amount)}
        </div>
    </>
  );

  return (
    <li>
      {selection ? (
        <label className={`${rowClass} cursor-pointer`}>{body}</label>
      ) : (
        <Link to={`/app/budgets/${budgetId}/day/${transaction.date}`} className={rowClass}>
          {body}
        </Link>
      )}
    </li>
  );
}
