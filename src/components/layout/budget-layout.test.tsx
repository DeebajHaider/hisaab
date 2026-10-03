import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { BudgetLayout } from "./budget-layout";

vi.mock("@/queries/use-budget", () => ({
  useBudget: () => ({ data: { id: "b1", name: "Personal" }, isLoading: false, error: null }),
}));
vi.mock("@/lib/format/date", () => ({ todayISO: () => "2026-10-03" }));

function sidebarLink(path: string, label: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/app/budgets/:budgetId" element={<BudgetLayout />}>
          <Route path="*" element={null} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
  // The desktop sidebar and the sheet are both in the DOM; the sidebar's link comes first.
  return screen.getAllByRole("link", { name: label })[0];
}

const isHighlighted = (el: HTMLElement) => el.className.includes("font-medium");

describe("budget sidebar highlighting", () => {
  it("highlights only the current section", () => {
    const month = sidebarLink("/app/budgets/b1/month/2026-10", "Month");
    expect(isHighlighted(month)).toBe(true);
    expect(screen.getAllByRole("link", { name: "Day view" })[0]).not.toHaveClass("font-medium");
    expect(screen.getAllByRole("link", { name: "Ledger" })[0]).not.toHaveClass("font-medium");
  });

  it("gives an inactive Day view the same muted style as the other inactive items", () => {
    sidebarLink("/app/budgets/b1/ledger", "Ledger");
    const day = screen.getAllByRole("link", { name: "Day view" })[0];
    const trends = screen.getAllByRole("link", { name: "Trends" })[0];
    expect(day).toHaveClass("text-muted-foreground");
    expect(day.className).toBe(trends.className);
  });

  it("highlights Day view for any date, not just today", () => {
    const day = sidebarLink("/app/budgets/b1/day/2026-09-01", "Day view");
    expect(isHighlighted(day)).toBe(true);
  });
});
