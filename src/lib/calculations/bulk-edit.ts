import type { TransactionWithRelations } from "@/queries/use-transactions";

/** Add the id if absent, remove it if present. Returns a new set. */
export function toggleSelection(selected: ReadonlySet<string>, id: string): Set<string> {
  const next = new Set(selected);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

/** Select every id in the group, or clear them all if they were already all selected. */
export function toggleGroup(selected: ReadonlySet<string>, ids: string[]): Set<string> {
  const next = new Set(selected);
  const allSelected = ids.length > 0 && ids.every((id) => next.has(id));
  for (const id of ids) {
    if (allSelected) next.delete(id);
    else next.add(id);
  }
  return next;
}

export interface BulkPatch {
  category_id?: string;
  item_id?: string;
  person_id?: string | null;
}

export type BulkPlan = { ok: true; patch: BulkPatch } | { ok: false; reason: string };

/** What to write when moving transactions to another item. The category follows
 *  the item. A person is kept, set or cleared by the same rule the entry form
 *  uses: categories that track people need one, the rest never have one. */
export function planMove(
  rows: TransactionWithRelations[],
  target: { itemId: string; categoryId: string; tracksPerson: boolean },
  personId: string | null,
): BulkPlan {
  const patch: BulkPatch = { category_id: target.categoryId, item_id: target.itemId };

  if (!target.tracksPerson) {
    patch.person_id = null;
    return { ok: true, patch };
  }
  if (personId) {
    patch.person_id = personId;
    return { ok: true, patch };
  }
  if (rows.some((r) => !r.person_id)) {
    return { ok: false, reason: "Pick a person: this category needs one." };
  }
  return { ok: true, patch };
}

/** Setting one person on many transactions only makes sense where the category tracks people. */
export function planSetPerson(rows: TransactionWithRelations[], personId: string): BulkPlan {
  if (rows.length === 0) return { ok: false, reason: "Nothing selected." };
  if (rows.some((r) => !r.category?.tracks_person)) {
    return {
      ok: false,
      reason: "Some selected transactions are in categories that don't track people.",
    };
  }
  return { ok: true, patch: { person_id: personId } };
}
