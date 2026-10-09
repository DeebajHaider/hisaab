import { supabase } from "@/lib/supabase";
import {
  buildBackup,
  fetchAllPages,
  type Backup,
  type BudgetBackup,
  type PortfolioBackup,
} from "./build-backup";

type Rows = Record<string, unknown>[];

/** Every row of one table (optionally narrowed by a column), paged past the 1000-row limit. */
function all(table: string, column?: string, value?: string): Promise<Rows> {
  return fetchAllPages(async (from, to) => {
    // The table name is dynamic, so the typed builder can't follow it.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query: any = supabase.from(table as never).select("*");
    if (column && value) query = query.eq(column, value);
    const { data, error } = await query.order("id").range(from, to);
    return { data: data as Rows | null, error };
  });
}

async function itemsOfBudget(budgetId: string): Promise<Rows> {
  return fetchAllPages(async (from, to) => {
    const { data, error } = await supabase
      .from("items")
      .select("*, category:categories!inner(budget_id)")
      .eq("category.budget_id", budgetId)
      .order("id")
      .range(from, to);
    const rows = (data ?? []).map(({ category: _category, ...item }) => item) as Rows;
    return { data: rows, error };
  });
}

async function backupBudget(budget: Record<string, unknown>): Promise<BudgetBackup> {
  const id = String(budget.id);
  const [categories, items, people, transactions, incomeEntries, savingsEntries, transactionTemplates, incomeTemplates, targets] =
    await Promise.all([
      all("categories", "budget_id", id),
      itemsOfBudget(id),
      all("people", "budget_id", id),
      all("transactions", "budget_id", id),
      all("income_entries", "budget_id", id),
      all("savings_entries", "budget_id", id),
      all("transaction_templates", "budget_id", id),
      all("income_templates", "budget_id", id),
      all("targets", "budget_id", id),
    ]);
  return { budget, categories, items, people, transactions, incomeEntries, savingsEntries, transactionTemplates, incomeTemplates, targets };
}

async function backupPortfolio(portfolio: Record<string, unknown>): Promise<PortfolioBackup> {
  const id = String(portfolio.id);
  const [assetClasses, holdings, holdingValueHistory] = await Promise.all([
    all("asset_classes", "portfolio_id", id),
    all("holdings", "portfolio_id", id),
    all("holding_value_history", "portfolio_id", id),
  ]);
  return { portfolio, assetClasses, holdings, holdingValueHistory };
}

/** Gather everything the signed-in person can see into one backup document. */
export async function exportBackup(): Promise<Backup> {
  const [budgets, portfolios] = await Promise.all([all("budgets"), all("portfolios")]);
  return buildBackup(
    await Promise.all(budgets.map(backupBudget)),
    await Promise.all(portfolios.map(backupPortfolio)),
  );
}
