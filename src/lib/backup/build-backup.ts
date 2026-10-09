export const BACKUP_VERSION = 1;

type Rows = Record<string, unknown>[];

export interface BudgetBackup {
  budget: Record<string, unknown>;
  categories: Rows;
  items: Rows;
  people: Rows;
  transactions: Rows;
  incomeEntries: Rows;
  savingsEntries: Rows;
  transactionTemplates: Rows;
  incomeTemplates: Rows;
  targets: Rows;
}

export interface PortfolioBackup {
  portfolio: Record<string, unknown>;
  assetClasses: Rows;
  holdings: Rows;
  holdingValueHistory: Rows;
}

export interface Backup {
  app: "hisaab";
  version: number;
  exportedAt: string;
  budgets: BudgetBackup[];
  portfolios: PortfolioBackup[];
}

/** The backup document: everything the person can see, as plain JSON. */
export function buildBackup(
  budgets: BudgetBackup[],
  portfolios: PortfolioBackup[],
  now: Date = new Date(),
): Backup {
  return {
    app: "hisaab",
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    budgets,
    portfolios,
  };
}

/** Counts shown to the person after exporting, so they can sanity-check it. */
export function summarizeBackup(backup: Backup): { budgets: number; transactions: number; portfolios: number } {
  return {
    budgets: backup.budgets.length,
    transactions: backup.budgets.reduce((n, b) => n + b.transactions.length, 0),
    portfolios: backup.portfolios.length,
  };
}

/** A file name like hisaab-backup-2026-10-09.json. */
export function backupFileName(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `hisaab-backup-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
}

/**
 * Read every row of a query, a page at a time. The API returns at most 1000
 * rows per request, so a single select would silently cut a big history short.
 */
export async function fetchAllPages(
  fetchPage: (from: number, to: number) => PromiseLike<{ data: Rows | null; error: { message: string } | null }>,
  pageSize = 1000,
): Promise<Rows> {
  const all: Rows = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await fetchPage(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    all.push(...rows);
    if (rows.length < pageSize) return all;
  }
}
