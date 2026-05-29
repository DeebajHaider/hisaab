import { useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  buildTransactionCSV,
  type ExportableTransaction,
} from "@/lib/import/transaction-export";

/**
 * The row shape returned by the export query. category and item are embedded
 * via PostgREST foreign-table selection. Each is a single related row, so
 * supabase-js types it as an object (not an array).
 */
interface ExportRow {
  date: string;
  amount: number;
  rate: number | null;
  qty: number | null;
  notes: string | null;
  category: { name: string } | null;
  item: { name: string } | null;
}

export interface ExportOptions {
  budgetId: string;
  /** Inclusive start date, YYYY-MM-DD. Omit for all-time. */
  from?: string;
  /** Inclusive end date, YYYY-MM-DD. Omit for all-time. */
  to?: string;
}

interface ExportResult {
  csv: string;
  rowCount: number;
}

/**
 * Fetch transactions for a budget (optionally bounded by a date range) and
 * serialize them to the narrow CSV the importer consumes.
 *
 * This is not a useQuery hook — export is an imperative, on-demand action
 * triggered by a button, not reactive state. It returns a callback the
 * caller invokes; the caller owns the loading flag and the file download.
 *
 * The query is independent of useTransactions / useMonthTransactions: it
 * fetches the whole range in one go (no day/month windowing) and selects
 * only the columns the CSV needs.
 */
export function useExportTransactions() {
  return useCallback(
    async ({ budgetId, from, to }: ExportOptions): Promise<ExportResult> => {
      // Embed category and item names via related-table selection. RLS still
      // applies — only rows in budgets the user can read come back.
      let query = supabase
        .from("transactions")
        .select(
          "date, amount, rate, qty, notes, category:categories(name), item:items(name)",
        )
        .eq("budget_id", budgetId)
        // Stable, sensible ordering for the output file.
        .order("date", { ascending: true });

      if (from) query = query.gte("date", from);
      if (to) query = query.lte("date", to);

      const { data, error } = await query;
      if (error) throw error;

      const rows = (data ?? []) as unknown as ExportRow[];

      // Flatten to the export shape. A transaction always has a category and
      // an item (both columns are NOT NULL with ON DELETE RESTRICT), so the
      // joins are present — the ?? fallbacks are belt-and-braces only.
      const transactions: ExportableTransaction[] = rows.map((r) => ({
        date: r.date,
        categoryName: r.category?.name ?? "(unknown category)",
        itemName: r.item?.name ?? "(unknown item)",
        amount: r.amount,
        rate: r.rate,
        qty: r.qty,
        notes: r.notes,
      }));

      return {
        csv: buildTransactionCSV(transactions),
        rowCount: transactions.length,
      };
    },
    [],
  );
}

