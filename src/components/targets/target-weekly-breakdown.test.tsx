import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TargetWeeklyBreakdown } from "./target-weekly-breakdown";
import type { Target } from "@/queries/use-targets";

const state = vi.hoisted(() => ({
  rows: [] as { date: string; amount: number }[],
  enabled: false,
}));

vi.mock("@/queries/use-target-spent", () => ({
  useTargetTransactions: (_b: string, _t: unknown, enabled: boolean) => {
    state.enabled = enabled;
    return { data: state.rows, isLoading: false, error: null };
  },
}));
vi.mock("@/lib/format/date", async (orig) => ({
  ...(await orig<typeof import("@/lib/format/date")>()),
  todayISO: () => "2026-10-10",
}));

const target = {
  id: "t1",
  name: "Food",
  target_amount: 31000,
  start_date: "2026-10-01",
  end_date: "2026-10-31",
} as Target;

beforeEach(() => {
  state.rows = [];
  state.enabled = false;
});

describe("TargetWeeklyBreakdown", () => {
  it("stays collapsed, and does not fetch, until opened", async () => {
    const user = userEvent.setup();
    render(<TargetWeeklyBreakdown budgetId="b1" target={target} currency="PKR" />);

    expect(state.enabled).toBe(false);
    expect(screen.queryByText("Week 1")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Weekly breakdown/ }));
    expect(state.enabled).toBe(true);
    expect(screen.getByText("Week 5")).toBeInTheDocument();
  });

  it("shows each week's limit and what was spent in it", async () => {
    state.rows = [
      { date: "2026-10-02", amount: 3000 },
      { date: "2026-10-09", amount: 7500 },
    ];
    const user = userEvent.setup();
    render(<TargetWeeklyBreakdown budgetId="b1" target={target} currency="PKR" />);
    await user.click(screen.getByRole("button", { name: /Weekly breakdown/ }));

    expect(screen.getByText("PKR 3,000.00")).toBeInTheDocument();
    expect(screen.getByText("PKR 7,500.00")).toBeInTheDocument();
    // Four full weeks of 7,000 and a short fifth of 3,000.
    expect(screen.getAllByText("of PKR 7,000.00")).toHaveLength(4);
    expect(screen.getByText("of PKR 3,000.00")).toBeInTheDocument();
  });

  it("marks the current week and flags a week that went over", async () => {
    state.rows = [{ date: "2026-10-09", amount: 7500 }];
    const user = userEvent.setup();
    render(<TargetWeeklyBreakdown budgetId="b1" target={target} currency="PKR" />);
    await user.click(screen.getByRole("button", { name: /Weekly breakdown/ }));

    // Today is Oct 10, which falls in week 2 (Oct 8 to 14).
    const current = document.querySelector('[aria-current="step"]') as HTMLElement;
    expect(within(current).getByText("Week 2")).toBeInTheDocument();
    expect(within(current).getByText("this week")).toBeInTheDocument();
    expect(within(current).getByText("PKR 7,500.00")).toHaveClass("text-red-600");
  });

  it("says weeks that have not started are not started", async () => {
    const user = userEvent.setup();
    render(<TargetWeeklyBreakdown budgetId="b1" target={target} currency="PKR" />);
    await user.click(screen.getByRole("button", { name: /Weekly breakdown/ }));
    expect(screen.getAllByText("Not started")).toHaveLength(3);
  });

  it("is not offered for a period of a week or less", () => {
    const { container } = render(
      <TargetWeeklyBreakdown
        budgetId="b1"
        target={{ ...target, start_date: "2026-10-05", end_date: "2026-10-11" }}
        currency="PKR"
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
