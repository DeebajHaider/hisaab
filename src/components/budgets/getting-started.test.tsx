import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GettingStarted } from "./getting-started";

const state = vi.hoisted(() => ({
  categories: undefined as unknown[] | undefined,
  items: undefined as unknown[] | undefined,
  lastDate: undefined as string | null | undefined,
}));

vi.mock("@/queries/use-categories", () => ({ useCategories: () => ({ data: state.categories }) }));
vi.mock("@/queries/use-items", () => ({ useItems: () => ({ data: state.items }) }));
vi.mock("@/queries/use-last-transaction-date", () => ({
  useLastTransactionDate: () => ({ data: state.lastDate }),
}));

const renderIt = () =>
  render(
    <MemoryRouter>
      <GettingStarted budgetId="b1" />
    </MemoryRouter>,
  );

beforeEach(() => {
  localStorage.clear();
  state.categories = [];
  state.items = [];
  state.lastDate = null;
});

describe("GettingStarted", () => {
  it("lists the three steps for an empty budget", () => {
    renderIt();
    expect(screen.getByText("Add a category, like Food or Car")).toBeInTheDocument();
    expect(screen.getByText("Log your first transaction")).toBeInTheDocument();
    expect(screen.getAllByLabelText("To do")).toHaveLength(3);
  });

  it("ticks off steps as they are completed", () => {
    state.categories = [{}];
    renderIt();
    expect(screen.getAllByLabelText("Done")).toHaveLength(1);
    expect(screen.getAllByLabelText("To do")).toHaveLength(2);
  });

  it("disappears once everything is done", () => {
    state.categories = [{}];
    state.items = [{}];
    state.lastDate = "2026-10-01";
    const { container } = renderIt();
    expect(container).toBeEmptyDOMElement();
  });

  it("stays out of the way while loading", () => {
    state.categories = undefined;
    const { container } = renderIt();
    expect(container).toBeEmptyDOMElement();
  });

  it("can be dismissed, and stays dismissed", async () => {
    const user = userEvent.setup();
    const { unmount, container } = renderIt();
    await user.click(screen.getByRole("button", { name: "Dismiss getting started" }));
    expect(container).toBeEmptyDOMElement();

    unmount();
    const again = renderIt();
    expect(again.container).toBeEmptyDOMElement();
  });
});
