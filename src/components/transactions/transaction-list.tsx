import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TransactionWithRelations } from "@/queries/use-transactions";
import {
  groupTransactionsByCategory,
  type CategoryGroup,
} from "@/lib/calculations/day-totals";

interface TransactionListProps {
  transactions: TransactionWithRelations[];
  currency: string;
  onEdit: (transaction: TransactionWithRelations) => void;
  onDelete: (transaction: TransactionWithRelations) => void;
}

/**
 * Render transactions grouped by category, with category subtotals.
 */
export function TransactionList({
  transactions,
  currency,
  onEdit,
  onDelete,
}: TransactionListProps) {
  const groups = groupTransactionsByCategory(transactions);

  if (groups.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/60 p-8 text-center">
        <p className="text-sm text-muted-foreground">
          No transactions logged for this day yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <CategoryBlock
          key={group.category.id}
          group={group}
          currency={currency}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}

function CategoryBlock({
  group,
  currency,
  onEdit,
  onDelete,
}: {
  group: CategoryGroup;
  currency: string;
  onEdit: (transaction: TransactionWithRelations) => void;
  onDelete: (transaction: TransactionWithRelations) => void;
}) {
  return (
    <div className="rounded-lg glass overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border/40 bg-muted/30">
        <span className="font-medium text-sm min-w-0 flex-1 truncate">{group.category.name}</span>
        <span className="text-sm tabular-nums text-muted-foreground shrink-0">
          {currency}{" "}
          {group.subtotal.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
      </div>
      <ul className="divide-y divide-border/30">
        {group.transactions.map((tx) => (
          <TransactionRow
            key={tx.id}
            transaction={tx}
            currency={currency}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </ul>
    </div>
  );
}

function TransactionRow({
  transaction,
  currency,
  onEdit,
  onDelete,
}: {
  transaction: TransactionWithRelations;
  currency: string;
  onEdit: (transaction: TransactionWithRelations) => void;
  onDelete: (transaction: TransactionWithRelations) => void;
}) {
  const hasRateQty =
    transaction.rate !== null && transaction.qty !== null;

  return (
    <li className="px-3 py-2 flex items-center gap-3 group hover:bg-muted/20 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="text-sm font-medium truncate">
            {transaction.item?.name ?? "Unknown item"}
          </span>
          {transaction.person && (
            <span className="text-xs text-muted-foreground">
              · {transaction.person.name}
            </span>
          )}
          {hasRateQty && (
            <span className="text-xs text-muted-foreground tabular-nums">
              · {transaction.rate} × {transaction.qty}
              {transaction.item?.unit && ` ${transaction.item.unit}`}
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
        {currency}{" "}
        {transaction.amount.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </div>

      <div className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex items-center gap-1 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="w-10 h-10 sm:w-7 sm:h-7"
          onClick={() => onEdit(transaction)}
        >
          <Pencil className="w-3 h-3" />
          <span className="sr-only">Edit</span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="w-10 h-10 sm:w-7 sm:h-7"
          onClick={() => onDelete(transaction)}
        >
          <Trash2 className="w-3 h-3" />
          <span className="sr-only">Delete</span>
        </Button>
      </div>
    </li>
  );
}