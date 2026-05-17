import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { transactionKeys } from "./transaction-keys";
import { trendsKeys } from "./trends-keys";
import type { Ref, TransactionImportPlan } from "@/lib/import/transaction-import";

interface ImportInput {
  budgetId: string;
  plan: TransactionImportPlan;
}

interface ImportResult {
  categoriesInserted: number;
  itemsInserted: number;
  transactionsInserted: number;
}

/**
 * Bulk-import a transaction plan into a budget.
 *
 * Execution order is dependency-driven and must not be reordered:
 *   1. Insert auto-created categories  (items & transactions need their ids)
 *   2. Insert auto-created items       (transactions need their ids)
 *   3. Insert the transactions
 *
 * On .select() usage: unlike useCreateTransaction, this hook DOES use
 * .select() after the category and item inserts — it needs the generated ids
 * to wire dependent rows. Safe here, and matches use-import-template.ts: the
 * RLS-evaluation gotcha only bites INSERT ... RETURNING while the
 * budget-creation trigger is mid-flight. These inserts happen in an
 * already-existing budget, so the SELECT policy just re-checks membership,
 * which already holds.
 *
 * Not transactional: if the items insert fails after categories succeed, the
 * categories remain. The all-or-nothing guarantee is enforced UPSTREAM by
 * buildTransactionImportPlan — a plan only reaches this hook when every row
 * validated, and the dry-run preview means the user has already seen exactly
 * what will be written. A mid-way failure here is an infrastructure error,
 * not a bad-data one. True atomicity would need a Postgres RPC (later).
 */
export function useImportTransactions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      budgetId,
      plan,
    }: ImportInput): Promise<ImportResult> => {
      const norm = (s: string) => s.trim().toLowerCase();

      // ----------------------------------------------------------------
      // 1. Insert auto-created categories, capturing their generated ids.
      // ----------------------------------------------------------------
      // sort_order continues after the count of existing active categories,
      // matching the template importer's convention.
      const { data: existingCats, error: catCountError } = await supabase
        .from("categories")
        .select("id")
        .eq("budget_id", budgetId)
        .eq("is_archived", false);
      if (catCountError) throw catCountError;

      let nextCatSort = (existingCats ?? []).length;

      // normalized new-category name -> generated id.
      const newCategoryIdByName = new Map<string, string>();

      if (plan.categoriesToCreate.length > 0) {
        const rows = plan.categoriesToCreate.map((c) => ({
          budget_id: budgetId,
          name: c.name,
          // Legacy data has no per-person concept; toggle in-app if needed.
          tracks_person: false,
          sort_order: nextCatSort++,
        }));

        const { data: inserted, error } = await supabase
          .from("categories")
          .insert(rows)
          .select("id, name");
        if (error) throw error;
        if (!inserted) throw new Error("No categories returned after insert");

        for (const c of inserted) newCategoryIdByName.set(norm(c.name), c.id);
      }

      /** Resolve a category Ref to a real id. */
      const resolveCategoryId = (ref: Ref): string => {
        if (ref.kind === "existing") return ref.id;
        const id = newCategoryIdByName.get(norm(ref.name));
        if (!id) {
          throw new Error(
            `Internal: category "${ref.name}" was not created before use.`,
          );
        }
        return id;
      };

      // ----------------------------------------------------------------
      // 2. Insert auto-created items, capturing their generated ids.
      // ----------------------------------------------------------------
      // Per-category sort_order baseline: count existing active items so new
      // ones land after them.
      const { data: existingItems, error: itemCountError } = await supabase
        .from("items")
        .select("category_id, category:categories!inner(budget_id)")
        .eq("category.budget_id", budgetId)
        .eq("is_archived", false);
      if (itemCountError) throw itemCountError;

      const itemSortByCategory = new Map<string, number>();
      for (const it of existingItems ?? []) {
        itemSortByCategory.set(
          it.category_id,
          (itemSortByCategory.get(it.category_id) ?? 0) + 1,
        );
      }

      // "categoryId::normItemName" -> generated item id.
      const newItemIdByKey = new Map<string, string>();

      if (plan.itemsToCreate.length > 0) {
        const itemRows = plan.itemsToCreate.map((it) => {
          // categoryRef resolves with no re-query: existing carries its id,
          // new is looked up in the step-1 map.
          const categoryId = resolveCategoryId(it.categoryRef);
          const sort = itemSortByCategory.get(categoryId) ?? 0;
          itemSortByCategory.set(categoryId, sort + 1);
          return {
            category_id: categoryId,
            name: it.name,
            // The narrow transactions CSV carries no unit/default_rate; mode
            // is inferred upstream. Set unit/rate in-app if wanted.
            unit: null,
            default_rate: null,
            default_mode: it.default_mode,
            sort_order: sort,
          };
        });

        const { data: insertedItems, error } = await supabase
          .from("items")
          .insert(itemRows)
          .select("id, name, category_id");
        if (error) throw error;
        if (!insertedItems) throw new Error("No items returned after insert");

        for (const it of insertedItems) {
          newItemIdByKey.set(`${it.category_id}::${norm(it.name)}`, it.id);
        }
      }

      /** Resolve an item Ref to a real id, given its resolved category id. */
      const resolveItemId = (ref: Ref, categoryId: string): string => {
        if (ref.kind === "existing") return ref.id;
        const id = newItemIdByKey.get(`${categoryId}::${norm(ref.name)}`);
        if (!id) {
          throw new Error(
            `Internal: item "${ref.name}" was not created before use.`,
          );
        }
        return id;
      };

      // ----------------------------------------------------------------
      // 3. Insert the transactions.
      // ----------------------------------------------------------------
      // created_by left to the DB default (auth.uid()). person_id is null on
      // every imported row — the legacy data has no per-person concept.
      const txRows = plan.transactions.map((t) => {
        const categoryId = resolveCategoryId(t.categoryRef);
        const itemId = resolveItemId(t.itemRef, categoryId);
        return {
          budget_id: budgetId,
          category_id: categoryId,
          item_id: itemId,
          person_id: null,
          date: t.date,
          amount: t.amount,
          rate: t.rate,
          qty: t.qty,
          notes: t.notes,
        };
      });

      if (txRows.length > 0) {
        // No .select() — we don't need the ids back. Same as useCreateTransaction.
        const { error } = await supabase.from("transactions").insert(txRows);
        if (error) throw error;
      }

      return {
        categoriesInserted: plan.categoriesToCreate.length,
        itemsInserted: plan.itemsToCreate.length,
        transactionsInserted: txRows.length,
      };
    },
    onSuccess: (_, variables) => {
      // Invalidate budget-scoped roots (cascades to day/month queries), plus
      // trends aggregations and the taxonomy lists — the import may have
      // created categories and items.
      queryClient.invalidateQueries({
        queryKey: transactionKeys.byBudget(variables.budgetId),
      });
      queryClient.invalidateQueries({
        queryKey: trendsKeys.byBudget(variables.budgetId),
      });
      queryClient.invalidateQueries({
        queryKey: ["categories", variables.budgetId],
      });
      queryClient.invalidateQueries({
        queryKey: ["items", variables.budgetId],
      });
    },
  });
}

