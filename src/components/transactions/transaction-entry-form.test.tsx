import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { TransactionEntryForm } from "./transaction-entry-form";

const state = vi.hoisted(() => ({
  items: [] as Record<string, unknown>[],
  createItem: { isPending: false, mutateAsync: vi.fn() },
  createTx: { isPending: false, mutateAsync: vi.fn() },
}));

const car = { id: "cat-car", name: "Car", budget_id: "b1", tracks_person: false };

vi.mock("@/queries/use-categories", () => ({
  useCategories: () => ({ data: [car], isLoading: false }),
}));
vi.mock("@/queries/use-items", () => ({
  useItems: () => ({ data: [...state.items], isLoading: false }),
}));
vi.mock("@/queries/use-people", () => ({ usePeople: () => ({ data: [] }) }));
vi.mock("@/queries/use-recent-items", () => ({ useRecentItems: () => ({ data: [] }) }));
vi.mock("@/queries/use-item-mutations", () => ({ useCreateItem: () => state.createItem }));
vi.mock("@/queries/use-transaction-mutations", () => ({
  useCreateTransaction: () => state.createTx,
  useUpdateTransaction: () => ({ isPending: false, mutateAsync: vi.fn() }),
}));

function item(id: string, name: string) {
  return {
    id,
    name,
    category_id: car.id,
    category: car,
    unit: null,
    default_rate: null,
    default_mode: "lump",
    sort_order: 0,
    is_archived: false,
  };
}

beforeAll(() => {
  // jsdom gaps that Radix Select and the combobox's scroll-into-view rely on.
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.hasPointerCapture = vi.fn(() => false);
  Element.prototype.releasePointerCapture = vi.fn();
});

beforeEach(() => {
  state.items = [item("item-petrol", "Petrol")];
  state.createTx.mutateAsync.mockReset();
  state.createItem.mutateAsync.mockReset().mockImplementation(
    async ({ name }: { name: string }) => {
      state.items.push(item("item-new", name));
      return "item-new";
    },
  );
});

const search = () => screen.getByLabelText("Search items");

describe("TransactionEntryForm inline item creation", () => {
  it("offers to add a new item only when no item matches the query exactly", async () => {
    const user = userEvent.setup();
    render(<TransactionEntryForm budgetId="b1" date="2026-10-02" />);

    await user.type(search(), "petrol");
    expect(screen.queryByText(/as a new item/)).not.toBeInTheDocument();

    await user.clear(search());
    await user.type(search(), "Chai");
    expect(screen.getByText(/as a new item/)).toHaveTextContent("Add “Chai” as a new item");
  });

  it("creates the item, selects it, and focuses the amount without submitting the transaction", async () => {
    const user = userEvent.setup();
    const { container } = render(<TransactionEntryForm budgetId="b1" date="2026-10-02" />);

    await user.type(search(), "Chai");
    await user.keyboard("{Enter}");

    const nameInput = screen.getByLabelText("Name");
    expect(nameInput).toHaveValue("Chai");

    await user.click(container.querySelector("#new-item-category")!);
    await user.click(within(screen.getByRole("listbox")).getByRole("option", { name: "Car" }));

    await user.click(nameInput);
    await user.keyboard("{Enter}");

    expect(state.createItem.mutateAsync).toHaveBeenCalledWith({
      budgetId: "b1",
      categoryId: "cat-car",
      name: "Chai",
    });
    expect(state.createTx.mutateAsync).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByLabelText("Name")).not.toBeInTheDocument());
    expect(search()).toHaveValue("Chai");
    await waitFor(() => expect(screen.getByLabelText("Amount")).toHaveFocus());
  });

  it("closes the panel on Escape without creating anything", async () => {
    const user = userEvent.setup();
    render(<TransactionEntryForm budgetId="b1" date="2026-10-02" />);

    await user.type(search(), "Chai");
    await user.keyboard("{Enter}");
    await user.keyboard("{Escape}");

    expect(screen.queryByLabelText("Name")).not.toBeInTheDocument();
    expect(state.createItem.mutateAsync).not.toHaveBeenCalled();
  });
});

describe("TransactionEntryForm focus flow", () => {
  it("moves focus to Amount after picking an existing item from search", async () => {
    const user = userEvent.setup();
    render(<TransactionEntryForm budgetId="b1" date="2026-10-02" />);

    await user.type(search(), "Petr");
    await user.click(await screen.findByRole("button", { name: /Petrol/ }));

    await waitFor(() => expect(screen.getByLabelText("Amount")).toHaveFocus());
  });

  it("goes to Qty when the item has a default rate in rate x qty mode", async () => {
    state.items = [
      { ...item("item-flour", "Flour"), default_mode: "rate_qty", default_rate: 180, unit: "Kg" },
    ];
    const user = userEvent.setup();
    render(<TransactionEntryForm budgetId="b1" date="2026-10-02" />);

    await user.type(search(), "Flo");
    await user.click(await screen.findByRole("button", { name: /Flour/ }));

    await waitFor(() => expect(screen.getByLabelText(/^Qty/)).toHaveFocus());
  });
});
