import { describe, expect, it } from "vitest";
import { getPageTitle } from "./page-title";

describe("getPageTitle", () => {
  it("titles the budgets home and account settings", () => {
    expect(getPageTitle("/app")).toBe("Budgets · Hisaab");
    expect(getPageTitle("/app/settings")).toBe("Account settings · Hisaab");
  });

  it("includes the budget name for budget pages", () => {
    const t = (path: string) => getPageTitle(path, { budgetName: "Personal" });
    expect(t("/app/budgets/b1/day/2026-10-02")).toBe("Day · Personal · Hisaab");
    expect(t("/app/budgets/b1/month/2026-10")).toBe("Month · Personal · Hisaab");
    expect(t("/app/budgets/b1/ledger")).toBe("Ledger · Personal · Hisaab");
    expect(t("/app/budgets/b1/targets")).toBe("Targets · Personal · Hisaab");
    expect(t("/app/budgets/b1/trends")).toBe("Trends · Personal · Hisaab");
    expect(t("/app/budgets/b1/members")).toBe("Members · Personal · Hisaab");
    expect(t("/app/budgets/b1/manage")).toBe("Manage · Personal · Hisaab");
    expect(t("/app/budgets/b1/settings")).toBe("Budget settings · Personal · Hisaab");
  });

  it("omits the budget name while it is still loading", () => {
    expect(getPageTitle("/app/budgets/b1/ledger")).toBe("Ledger · Hisaab");
  });

  it("titles portfolio pages, with the portfolio name when known", () => {
    expect(getPageTitle("/app/portfolio")).toBe("Portfolios · Hisaab");
    expect(getPageTitle("/app/portfolio/p1/overview", { portfolioName: "Retirement" })).toBe(
      "Overview · Retirement · Hisaab",
    );
    expect(getPageTitle("/app/portfolio/p1/holdings")).toBe("Holdings · Hisaab");
    expect(getPageTitle("/app/portfolio/p1/manage")).toBe("Manage · Hisaab");
  });

  it("falls back to the bare app name for anything else", () => {
    expect(getPageTitle("/app/budgets/b1")).toBe("Hisaab");
    expect(getPageTitle("/somewhere/else")).toBe("Hisaab");
  });
});
