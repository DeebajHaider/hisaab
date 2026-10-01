import type { TransactionWithRelations } from "@/queries/use-transactions";
import { roundToCents } from "./day-totals";

export interface DayGroup {
  date: string;
  transactions: TransactionWithRelations[];
  subtotal: number;
}

/**
 * Group transactions under their date, computing per-day subtotals.
 * Days ordered newest first; transactions within each day preserve input
 * order (the ledger query already orders newest-first within a day).
 *
 * Mirrors groupTransactionsByCategory in day-totals.ts, keyed by date
 * instead of category — this is the Ledger page's bank-statement grouping.
 */
export function groupTransactionsByDay(
  transactions: TransactionWithRelations[],
): DayGroup[] {
  const groups = new Map<string, DayGroup>();

  for (const tx of transactions) {
    const existing = groups.get(tx.date);
    if (existing) {
      existing.transactions.push(tx);
      existing.subtotal = roundToCents(existing.subtotal + tx.amount);
    } else {
      groups.set(tx.date, {
        date: tx.date,
        transactions: [tx],
        subtotal: roundToCents(tx.amount),
      });
    }
  }

  return Array.from(groups.values()).sort((a, b) => b.date.localeCompare(a.date));
}
