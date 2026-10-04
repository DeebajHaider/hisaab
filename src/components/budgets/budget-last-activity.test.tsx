import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BudgetLastActivity } from "./budget-last-activity";

const state = vi.hoisted(() => ({
  result: {} as { data: string | null | undefined; isError: boolean },
}));

vi.mock("@/queries/use-last-transaction-date", () => ({
  useLastTransactionDate: () => state.result,
}));
vi.mock("@/lib/format/date", () => ({
  formatDayLabel: (d: string) => (d === "2026-10-03" ? "Yesterday" : "Mon, Sep 1"),
}));

beforeEach(() => {
  state.result = { data: undefined, isError: false };
});

describe("BudgetLastActivity", () => {
  it("shows the date of the last transaction", () => {
    state.result = { data: "2026-10-03", isError: false };
    render(<BudgetLastActivity budgetId="b1" />);
    expect(screen.getByText("Last transaction Yesterday")).toBeInTheDocument();
  });

  it("says so when the budget has no transactions", () => {
    state.result = { data: null, isError: false };
    render(<BudgetLastActivity budgetId="b1" />);
    expect(screen.getByText("No transactions yet")).toBeInTheDocument();
  });

  it("renders nothing while loading or on error", () => {
    const { container, rerender } = render(<BudgetLastActivity budgetId="b1" />);
    expect(container).toBeEmptyDOMElement();

    state.result = { data: undefined, isError: true };
    rerender(<BudgetLastActivity budgetId="b1" />);
    expect(container).toBeEmptyDOMElement();
  });
});
