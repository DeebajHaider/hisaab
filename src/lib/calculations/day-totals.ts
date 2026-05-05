import type { TransactionWithRelations } from "@/queries/use-transactions";

export interface CategoryGroup {
  category: NonNullable<TransactionWithRelations["category"]>;
  transactions: TransactionWithRelations[];
  subtotal: number;
}

/**
 * Sum the amounts of all transactions, with floating-point safety.
 * We use cents-based math then convert back to avoid 0.1 + 0.2 = 0.30000...4.
 */
export function calculateDayTotal(
  transactions: TransactionWithRelations[],
): number {
  const totalCents = transactions.reduce(
    (acc, tx) => acc + Math.round(tx.amount * 100),
    0,
  );
  return totalCents / 100;
}

/**
 * Group transactions under their categories, computing subtotals.
 * Categories ordered alphabetically; transactions within each preserve input order.
 *
 * Transactions with null category are dropped — the schema doesn't allow this
 * but defensive code costs nothing.
 */
export function groupTransactionsByCategory(
  transactions: TransactionWithRelations[],
): CategoryGroup[] {
  const groups = new Map<string, CategoryGroup>();

  for (const tx of transactions) {
    if (!tx.category) continue;

    const existing = groups.get(tx.category.id);
    if (existing) {
      existing.transactions.push(tx);
      existing.subtotal = roundToCents(existing.subtotal + tx.amount);
    } else {
      groups.set(tx.category.id, {
        category: tx.category,
        transactions: [tx],
        subtotal: roundToCents(tx.amount),
      });
    }
  }

  return Array.from(groups.values()).sort((a, b) =>
    a.category.name.localeCompare(b.category.name),
  );
}

function roundToCents(value: number): number {
  return Math.round(value * 100) / 100;
}