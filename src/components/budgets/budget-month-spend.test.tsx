import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BudgetMonthSpend } from "./budget-month-spend";

const state = vi.hoisted(() => ({
  result: { data: undefined, isLoading: true, isError: false } as {
    data: { yearMonth: string; total: number }[] | undefined;
    isLoading: boolean;
    isError: boolean;
  },
  args: [] as unknown[],
}));

vi.mock("@/queries/use-monthly-totals", () => ({
  useMonthlyTotals: (...args: unknown[]) => {
    state.args = args;
    return state.result;
  },
}));
vi.mock("@/lib/format/year-month", async (orig) => ({
  ...(await orig<typeof import("@/lib/format/year-month")>()),
  currentYearMonth: () => "2026-10",
}));

beforeEach(() => {
  state.result = { data: undefined, isLoading: true, isError: false };
});

describe("BudgetMonthSpend", () => {
  it("asks for last month through this month", () => {
    render(<BudgetMonthSpend budgetId="b1" currency="PKR" />);
    expect(state.args).toEqual(["b1", "2026-09", "2026-10"]);
  });

  it("shows this month's total and last month's for reference", () => {
    state.result = {
      isLoading: false,
      isError: false,
      data: [
        { yearMonth: "2026-09", total: 80000 },
        { yearMonth: "2026-10", total: 18650.5 },
      ],
    };
    render(<BudgetMonthSpend budgetId="b1" currency="PKR" />);

    expect(screen.getByText("PKR 18,650.50")).toBeInTheDocument();
    expect(screen.getByText("Last month PKR 80,000.00")).toBeInTheDocument();
    expect(screen.getByText(/October 2026/)).toBeInTheDocument();
  });

  it("shows zero when nothing is logged this month, and hides an empty last month", () => {
    state.result = { isLoading: false, isError: false, data: [] };
    render(<BudgetMonthSpend budgetId="b1" currency="PKR" />);

    expect(screen.getByText("PKR 0.00")).toBeInTheDocument();
    expect(screen.queryByText(/Last month/)).not.toBeInTheDocument();
  });

  it("renders nothing when the totals fail, so the card still works", () => {
    state.result = { isLoading: false, isError: true, data: undefined };
    const { container } = render(<BudgetMonthSpend budgetId="b1" currency="PKR" />);
    expect(container).toBeEmptyDOMElement();
  });
});
