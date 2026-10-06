import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BudgetsHome } from "./budgets-home";

vi.mock("@/queries/use-budgets", () => ({
  useBudgets: () => ({
    data: [
      { id: "a", name: "Alpha", currency: "PKR", is_shared: false },
      { id: "b", name: "Beta", currency: "PKR", is_shared: false },
      { id: "c", name: "Gamma", currency: "PKR", is_shared: true },
    ],
    isLoading: false,
    error: null,
  }),
}));
vi.mock("@/lib/auth-context", () => ({ useAuth: () => ({ user: { id: "u1" } }) }));
vi.mock("@/components/budgets/create-budget-dialog", () => ({ CreateBudgetDialog: () => null }));
vi.mock("@/components/layout/resume-last-page", () => ({ ResumeLastPage: () => null }));
vi.mock("@/components/budgets/budget-month-spend", () => ({ BudgetMonthSpend: () => null }));
vi.mock("@/components/budgets/budget-last-activity", () => ({ BudgetLastActivity: () => null }));

const order = () =>
  screen.getAllByRole("link").map((a) => a.textContent?.replace("Shared", "").trim());

beforeEach(() => localStorage.clear());

describe("BudgetsHome pinning", () => {
  it("floats a pinned budget to the top and remembers it", async () => {
    const user = userEvent.setup();
    const { unmount } = render(
      <MemoryRouter>
        <BudgetsHome />
      </MemoryRouter>,
    );
    expect(order()).toEqual(["Alpha", "Beta", "Gamma"]);

    await user.click(screen.getByRole("button", { name: "Pin Gamma" }));
    expect(order()).toEqual(["Gamma", "Alpha", "Beta"]);
    expect(screen.getByRole("button", { name: "Unpin Gamma" })).toHaveAttribute("aria-pressed", "true");

    unmount();
    render(
      <MemoryRouter>
        <BudgetsHome />
      </MemoryRouter>,
    );
    expect(order()).toEqual(["Gamma", "Alpha", "Beta"]);
  });

  it("unpins back to the original order", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <BudgetsHome />
      </MemoryRouter>,
    );
    await user.click(screen.getByRole("button", { name: "Pin Beta" }));
    await user.click(screen.getByRole("button", { name: "Unpin Beta" }));
    expect(order()).toEqual(["Alpha", "Beta", "Gamma"]);
  });
});
