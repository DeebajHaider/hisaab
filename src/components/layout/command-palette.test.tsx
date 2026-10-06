import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { CommandPalette } from "./command-palette";

vi.mock("@/queries/use-budgets", () => ({
  useBudgets: () => ({
    data: [
      { id: "b1", name: "Personal" },
      { id: "b2", name: "Family" },
    ],
  }),
}));
vi.mock("@/queries/use-portfolios", () => ({
  usePortfolios: () => ({ data: [{ id: "p1", name: "Retirement" }] }),
}));
vi.mock("@/lib/theme-provider", () => ({ useTheme: () => ({ setTheme: vi.fn() }) }));
vi.mock("@/lib/format/date", async (orig) => ({
  ...(await orig<typeof import("@/lib/format/date")>()),
  todayISO: () => "2026-10-03",
}));
vi.mock("@/lib/format/year-month", async (orig) => ({
  ...(await orig<typeof import("@/lib/format/year-month")>()),
  currentYearMonth: () => "2026-10",
}));

beforeAll(() => {
  // cmdk relies on these, which jsdom lacks.
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  Element.prototype.scrollIntoView = vi.fn();
});

function Where() {
  return <div data-testid="where">{useLocation().pathname}</div>;
}

function setup(path = "/app/budgets/b1/ledger", onHelp?: () => void) {
  const user = userEvent.setup();
  render(
    <MemoryRouter initialEntries={[path]}>
      <CommandPalette onHelp={onHelp} />
      <Routes>
        <Route
          path="*"
          element={
            <>
              <Where />
              <input data-testid="field" />
              <input data-entry-search data-testid="search" />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
  return user;
}

const where = () => screen.getByTestId("where").textContent;

describe("CommandPalette shortcuts", () => {
  it("opens on Ctrl+K and closes on a second Ctrl+K", async () => {
    const user = setup();
    await user.keyboard("{Control>}k{/Control}");
    expect(await screen.findByPlaceholderText(/Jump to a page/)).toBeInTheDocument();

    await user.keyboard("{Control>}k{/Control}");
    await waitFor(() =>
      expect(screen.queryByPlaceholderText(/Jump to a page/)).not.toBeInTheDocument(),
    );
  });

  it("lists this budget's pages, other budgets and portfolios, and navigates on select", async () => {
    const user = setup();
    await user.keyboard("{Control>}k{/Control}");

    expect(await screen.findByText("Month")).toBeInTheDocument();
    expect(screen.getByText("Family")).toBeInTheDocument();
    expect(screen.queryByText("Personal")).toBeInTheDocument(); // as the group heading
    expect(screen.getByText("Retirement")).toBeInTheDocument();

    await user.click(screen.getByText("Retirement"));
    expect(where()).toBe("/app/portfolio/p1/overview");
  });

  it("filters by typing", async () => {
    const user = setup();
    await user.keyboard("{Control>}k{/Control}");
    await user.type(await screen.findByPlaceholderText(/Jump to a page/), "ledg");

    expect(screen.getByText("Ledger")).toBeInTheDocument();
    expect(screen.queryByText("Trends")).not.toBeInTheDocument();
  });

  it("navigates with g-then-letter sequences, scoped to the current budget", async () => {
    const user = setup("/app/budgets/b1/ledger");
    await user.keyboard("gd");
    expect(where()).toBe("/app/budgets/b1/day/2026-10-03");
    await user.keyboard("gm");
    expect(where()).toBe("/app/budgets/b1/month");
    await user.keyboard("gt");
    expect(where()).toBe("/app/budgets/b1/trends");
  });

  it("does nothing for g-sequences outside a budget", async () => {
    const user = setup("/app/portfolio");
    await user.keyboard("gd");
    expect(where()).toBe("/app/portfolio");
  });

  it("focuses the item search on n", async () => {
    const user = setup();
    await user.keyboard("n");
    expect(screen.getByTestId("search")).toHaveFocus();
  });

  it("ignores letter shortcuts while typing in a field", async () => {
    const user = setup();
    await user.click(screen.getByTestId("field"));
    await user.keyboard("gdn");
    expect(where()).toBe("/app/budgets/b1/ledger");
    expect(screen.getByTestId("field")).toHaveValue("gdn");
  });

  it("still opens the palette from inside a field", async () => {
    const user = setup();
    await user.click(screen.getByTestId("field"));
    await user.keyboard("{Control>}k{/Control}");
    expect(await screen.findByPlaceholderText(/Jump to a page/)).toBeInTheDocument();
  });

  it("steps through days with the arrow keys and jumps to today with t", async () => {
    const user = setup("/app/budgets/b1/day/2026-10-01");
    await user.keyboard("{ArrowRight}");
    expect(where()).toBe("/app/budgets/b1/day/2026-10-02");
    await user.keyboard("{ArrowLeft}{ArrowLeft}");
    expect(where()).toBe("/app/budgets/b1/day/2026-09-30");
    await user.keyboard("t");
    expect(where()).toBe("/app/budgets/b1/day/2026-10-03");
  });

  it("steps through months with the arrow keys and jumps to this month with t", async () => {
    const user = setup("/app/budgets/b1/month/2026-01");
    await user.keyboard("{ArrowLeft}");
    expect(where()).toBe("/app/budgets/b1/month/2025-12");
    await user.keyboard("t");
    expect(where()).toBe("/app/budgets/b1/month/2026-10");
  });

  it("leaves arrows and t alone on pages they do not apply to", async () => {
    const user = setup("/app/budgets/b1/ledger");
    await user.keyboard("{ArrowRight}t");
    expect(where()).toBe("/app/budgets/b1/ledger");
  });

  it("opens the shortcut help on ?", async () => {
    const onHelp = vi.fn();
    const user = setup("/app/budgets/b1/ledger", onHelp);
    await user.keyboard("?");
    expect(onHelp).toHaveBeenCalledTimes(1);
  });

  it("does not trigger help while typing a question mark in a field", async () => {
    const onHelp = vi.fn();
    const user = setup("/app/budgets/b1/ledger", onHelp);
    await user.click(screen.getByTestId("field"));
    await user.keyboard("?");
    expect(onHelp).not.toHaveBeenCalled();
    expect(screen.getByTestId("field")).toHaveValue("?");
  });
});
