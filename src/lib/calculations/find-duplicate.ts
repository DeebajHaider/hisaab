import type { TransactionWithRelations } from "@/queries/use-transactions";

/** An already-logged transaction for the same item and amount, if any.
 *  `excludeId` skips the row being edited. */
export function findDuplicate(
  existing: TransactionWithRelations[],
  candidate: { itemId: string | null; amount: number },
  excludeId?: string,
): TransactionWithRelations | null {
  if (!candidate.itemId || !Number.isFinite(candidate.amount) || candidate.amount <= 0) {
    return null;
  }
  return (
    existing.find(
      (t) =>
        t.id !== excludeId &&
        t.item_id === candidate.itemId &&
        Math.round(t.amount * 100) === Math.round(candidate.amount * 100),
    ) ?? null
  );
}
