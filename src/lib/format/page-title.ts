const APP = "Hisaab";

const BUDGET_PAGES: Record<string, string> = {
  day: "Day",
  month: "Month",
  ledger: "Ledger",
  targets: "Targets",
  trends: "Trends",
  members: "Members",
  manage: "Manage",
  settings: "Budget settings",
};

const PORTFOLIO_PAGES: Record<string, string> = {
  overview: "Overview",
  holdings: "Holdings",
  manage: "Manage",
};

interface TitleContext {
  budgetName?: string;
  portfolioName?: string;
}

/** Browser-tab title for an in-app path, e.g. "Ledger · Personal · Hisaab". */
export function getPageTitle(pathname: string, ctx: TitleContext = {}): string {
  const join = (...parts: (string | undefined)[]) =>
    parts.filter(Boolean).join(" · ");
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] !== "app") return APP;

  if (parts.length === 1) return join("Budgets", APP);
  if (parts[1] === "settings") return join("Account settings", APP);

  if (parts[1] === "budgets") {
    const page = BUDGET_PAGES[parts[3] ?? ""];
    return page ? join(page, ctx.budgetName, APP) : APP;
  }

  if (parts[1] === "portfolio") {
    if (parts.length === 2) return join("Portfolios", APP);
    const page = PORTFOLIO_PAGES[parts[3] ?? ""];
    return page ? join(page, ctx.portfolioName, APP) : APP;
  }

  return APP;
}
