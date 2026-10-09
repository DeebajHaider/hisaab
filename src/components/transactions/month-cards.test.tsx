import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MonthCompareCard } from "./month-compare-card";
import { SpendingHeatmap } from "./spending-heatmap";
import { MonthRecapCard } from "./month-recap-card";
import type { TransactionWithRelations } from "@/queries/use-transactions";

const state = vi.hoisted(() => ({ other: [] as unknown[], asked: [] as unknown[] }));

vi.mock("@/queries/use-month-transactions", () => ({
  useMonthTransactions: (_b: string, ym: string) => {
    state.asked.push(ym);
    return { data: state.other, isLoading: false };
  },
}));

const tx = (date: string, category: string, amount: number) =>
  ({ date, amount, category: { name: category } }) as unknown as TransactionWithRelations;

beforeEach(() => {
  state.other = [];
  state.asked = [];
});

describe("MonthCompareCard", () => {
  it("compares with last month by default and steps further back", async () => {
    const user = userEvent.setup();
    state.other = [tx("2026-09-05", "Food", 400)];
    render(
      <MonthCompareCard
        budgetId="b1"
        yearMonth="2026-10"
        current={[tx("2026-10-02", "Food", 500)]}
        currency="PKR"
      />,
    );

    expect(screen.getByText("vs September 2026")).toBeInTheDocument();
    expect(screen.getByText("+100.00")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Compare with a later month" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Compare with an earlier month" }));
    expect(screen.getByText("vs August 2026")).toBeInTheDocument();
    expect(state.asked).toContain("2026-08");
  });

  it("says so when neither month has anything", () => {
    render(<MonthCompareCard budgetId="b1" yearMonth="2026-10" current={[]} currency="PKR" />);
    expect(screen.getByText("Nothing logged in either month.")).toBeInTheDocument();
  });
});

describe("SpendingHeatmap", () => {
  it("links every day to its Day view", () => {
    render(
      <MemoryRouter>
        <SpendingHeatmap
          budgetId="b1"
          yearMonth="2026-10"
          transactions={[tx("2026-10-03", "Food", 250)]}
          currency="PKR"
        />
      </MemoryRouter>,
    );
    const day = screen
      .getAllByRole("link")
      .find((a) => a.getAttribute("href") === "/app/budgets/b1/day/2026-10-03")!;
    expect(day).toHaveAccessibleName(/PKR 250/);
    expect(screen.getAllByRole("link")).toHaveLength(31);
  });
});

describe("MonthRecapCard", () => {
  it("renders the recap lines, or nothing without data", () => {
    const { container, rerender } = render(
      <MonthRecapCard current={[]} previous={[]} daysElapsed={5} totalDays={31} currency="PKR" />,
    );
    expect(container).toBeEmptyDOMElement();

    rerender(
      <MonthRecapCard
        current={[tx("2026-10-02", "Food", 100)]}
        previous={[]}
        daysElapsed={5}
        totalDays={31}
        currency="PKR"
      />,
    );
    expect(screen.getByText("Logged on 1 of 5 days.")).toBeInTheDocument();
  });
});
