import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { transactionKeys } from "./transaction-keys";
import type { TransactionWithRelations } from "./use-transactions";
import { containsPattern } from "@/lib/search/like-pattern";

export const LEDGER_ROW_CAP = 1000;

export interface LedgerFilters {
  from: string;
  to: string;
  categoryIds: string[];
  itemIds: string[];
  personIds: string[];
  /** Free text matched against the transaction's notes. */
  search: string;
}

/**
 * Fetch transactions in a budget across an arbitrary date range, optionally
 * narrowed to specific categories, items, people and/or a notes search, newest first — the data
 * source for the Ledger page.
 *
 * Unlike useMonthTransactions (bounded to one calendar month, so safely
 * under PostgREST's row cap), this can span years. LEDGER_ROW_CAP mirrors
 * that cap explicitly so the page can detect truncation and tell the user
 * to narrow their filters, rather than silently showing a partial sum.
 */
export function useLedgerTransactions(
  budgetId: string | undefined,
  filters: LedgerFilters,
) {
  const { from, to, categoryIds, itemIds, personIds, search } = filters;
  const notesPattern = containsPattern(search);

  return useQuery({
    queryKey: budgetId
      ? transactionKeys.ledger(budgetId, from, to, categoryIds, itemIds, personIds, notesPattern ?? "")
      : ["transactions", "noop"],
    enabled: !!budgetId && !!from && !!to,
    // Keep the old rows on screen while a changed filter loads, so typing in
    // the search box doesn't flash the list to skeletons. Only within the
    // same budget: another budget's rows must never stand in for these.
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[1] === budgetId ? previous : undefined,
    queryFn: async (): Promise<TransactionWithRelations[]> => {
      let query = supabase
        .from("transactions")
        .select(`
          *,
          item:items(id, name, unit),
          category:categories(id, name, tracks_person),
          person:people(id, name)
        `)
        .eq("budget_id", budgetId!)
        .gte("date", from)
        .lte("date", to);

      if (categoryIds.length > 0) {
        query = query.in("category_id", categoryIds);
      }
      if (itemIds.length > 0) {
        query = query.in("item_id", itemIds);
      }
      if (personIds.length > 0) {
        query = query.in("person_id", personIds);
      }
      if (notesPattern) {
        query = query.ilike("notes", notesPattern);
      }

      const { data, error } = await query
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(LEDGER_ROW_CAP);

      if (error) throw error;

      return (data ?? []) as unknown as TransactionWithRelations[];
    },
  });
}
