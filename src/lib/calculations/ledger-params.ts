const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export interface LedgerParams {
  from?: string;
  to?: string;
  categoryIds: string[];
  itemIds: string[];
}

/** A Ledger URL pre-filtered to a category and/or item over a date range. */
export function buildLedgerHref(
  budgetId: string,
  filter: { categoryId?: string; itemId?: string; from: string; to: string },
): string {
  const params = new URLSearchParams();
  if (filter.categoryId) params.set("category", filter.categoryId);
  if (filter.itemId) params.set("item", filter.itemId);
  params.set("from", filter.from);
  params.set("to", filter.to);
  return `/app/budgets/${budgetId}/ledger?${params.toString()}`;
}

/** Initial Ledger filters from the URL. Malformed or missing values are dropped. */
export function parseLedgerParams(params: URLSearchParams): LedgerParams {
  const date = (key: string) => {
    const value = params.get(key);
    return value && ISO_DATE.test(value) ? value : undefined;
  };
  const list = (key: string) => (params.get(key) ?? "").split(",").filter(Boolean);
  return { from: date("from"), to: date("to"), categoryIds: list("category"), itemIds: list("item") };
}
