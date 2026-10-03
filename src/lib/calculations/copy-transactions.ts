import type { Database } from "@/types/db";
import type { TransactionWithRelations } from "@/queries/use-transactions";

export type TransactionInsert = Database["public"]["Tables"]["transactions"]["Insert"];

/** Rows that log the same things again on `targetDate`. Notes are dropped on
 *  purpose: they describe one occasion, not the item. */
export function buildCopies(
  source: TransactionWithRelations[],
  targetDate: string,
  newId: () => string,
): TransactionInsert[] {
  return source.map((t) => ({
    id: newId(),
    budget_id: t.budget_id,
    category_id: t.category_id,
    item_id: t.item_id,
    date: targetDate,
    amount: t.amount,
    rate: t.rate,
    qty: t.qty,
    person_id: t.person_id,
    notes: null,
  }));
}

export interface RepeatDraft {
  itemId: string;
  categoryId: string;
  mode: "lump" | "rate_qty";
  rate: string;
  qty: string;
  amount: string;
  personId: string | null;
}

/** Starting values for the Add form when logging a transaction again. */
export function buildRepeatDraft(t: TransactionWithRelations): RepeatDraft {
  const hasRateQty = t.rate !== null && t.qty !== null;
  return {
    itemId: t.item_id,
    categoryId: t.category_id,
    mode: hasRateQty ? "rate_qty" : "lump",
    rate: hasRateQty ? String(t.rate) : "",
    qty: hasRateQty ? String(t.qty) : "",
    amount: String(t.amount),
    personId: t.person_id,
  };
}
