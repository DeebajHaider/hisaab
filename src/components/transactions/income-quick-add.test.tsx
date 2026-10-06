import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { IncomeQuickAdd } from "./income-quick-add";

const state = vi.hoisted(() => ({
  templates: [] as Record<string, unknown>[],
  isLoading: false,
  mutate: vi.fn(),
}));

vi.mock("@/queries/use-income-templates", () => ({
  useIncomeTemplates: () => ({ data: state.templates, isLoading: state.isLoading }),
}));
vi.mock("@/queries/use-income-mutations", () => ({
  useCreateIncome: () => ({ mutate: state.mutate, isPending: false, variables: undefined }),
}));
vi.mock("@/lib/format/date", () => ({ todayISO: () => "2026-10-06" }));

beforeEach(() => {
  state.templates = [
    { id: "t1", source: "Salary", amount: 150000, notes: "monthly" },
    { id: "t2", source: "Fixed return", amount: 12500.5, notes: null },
  ];
  state.isLoading = false;
  state.mutate.mockReset();
});

describe("IncomeQuickAdd", () => {
  it("logs the template as an entry dated today when viewing the current month", async () => {
    const user = userEvent.setup();
    render(<IncomeQuickAdd budgetId="b1" yearMonth="2026-10" currency="PKR" />);

    await user.click(screen.getByRole("button", { name: /Salary/ }));

    expect(state.mutate).toHaveBeenCalledWith({
      budgetId: "b1",
      source: "Salary",
      amount: 150000,
      date: "2026-10-06",
      notes: "monthly",
    });
  });

  it("dates the entry the 1st when viewing another month", async () => {
    const user = userEvent.setup();
    render(<IncomeQuickAdd budgetId="b1" yearMonth="2026-09" currency="PKR" />);

    await user.click(screen.getByRole("button", { name: /Fixed return/ }));

    expect(state.mutate).toHaveBeenCalledWith(
      expect.objectContaining({ date: "2026-09-01", amount: 12500.5, notes: null }),
    );
  });

  it("renders nothing when there are no templates", () => {
    state.templates = [];
    const { container } = render(<IncomeQuickAdd budgetId="b1" yearMonth="2026-10" currency="PKR" />);
    expect(container).toBeEmptyDOMElement();
  });
});
