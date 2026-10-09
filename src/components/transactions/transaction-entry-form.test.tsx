import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { TransactionEntryForm } from "./transaction-entry-form";

const state = vi.hoisted(() => ({
  items: [] as Record<string, unknown>[],
  createItem: { isPending: false, mutateAsync: vi.fn() },
  createTx: { isPending: false, mutateAsync: vi.fn() },
  dayRows: [] as Record<string, unknown>[],
}));

const car = { id: "cat-car", name: "Car", budget_id: "b1", tracks_person: false };

vi.mock("@/queries/use-categories", () => ({
  useCategories: () => ({ data: [car], isLoading: false }),
}));
vi.mock("@/queries/use-items", () => ({
  useItems: () => ({ data: [...state.items], isLoading: false }),
}));
vi.mock("@/queries/use-people", () => ({ usePeople: () => ({ data: [] }) }));
vi.mock("@/queries/use-transactions", () => ({
  useTransactions: () => ({ data: state.dayRows }),
}));
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
  state.dayRows = [];
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
    render(<TransactionEntryForm budgetId="b1" date="2026-10-02" />);

    await user.type(search(), "Chai");
    await user.keyboard("{Enter}");

    const nameInput = screen.getByLabelText("Name");
    expect(nameInput).toHaveValue("Chai");

    const panel = screen.getByText("New item").closest("div")!.parentElement!;
    await user.click(within(panel).getByRole("combobox"));
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

describe("TransactionEntryForm log again", () => {
  it("starts from the previous transaction and selects the amount for overwriting", async () => {
    const user = userEvent.setup();
    render(
      <TransactionEntryForm
        budgetId="b1"
        date="2026-10-02"
        initial={{
          itemId: "item-petrol",
          categoryId: "cat-car",
          mode: "lump",
          rate: "",
          qty: "",
          amount: "4250",
          personId: null,
        }}
      />,
    );

    expect(search()).toHaveValue("Petrol");
    const amount = screen.getByLabelText("Amount") as HTMLInputElement;
    await waitFor(() => expect(amount).toHaveFocus());
    expect(amount).toHaveValue("4250");

    // Selected on focus, so typing replaces 4250 instead of appending to it.
    await user.keyboard("5000");
    expect(amount).toHaveValue("5000");
  });

  it("lands on Qty for rate x qty items", async () => {
    state.items = [
      { ...item("item-flour", "Flour"), default_mode: "rate_qty", default_rate: 180, unit: "Kg" },
    ];
    render(
      <TransactionEntryForm
        budgetId="b1"
        date="2026-10-02"
        initial={{
          itemId: "item-flour",
          categoryId: "cat-car",
          mode: "rate_qty",
          rate: "180",
          qty: "2",
          amount: "360",
          personId: null,
        }}
      />,
    );

    await waitFor(() => expect(screen.getByLabelText(/^Qty/)).toHaveFocus());
    expect(screen.getByLabelText("Rate")).toHaveValue(180);
  });
});

describe("TransactionEntryForm with two copies mounted (page form + Edit dialog)", () => {
  it("gives every element a unique id and keeps each label tied to its own field", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <>
        <section data-testid="page">
          <TransactionEntryForm budgetId="b1" date="2026-10-02" />
        </section>
        <section data-testid="dialog">
          <TransactionEntryForm budgetId="b1" date="2026-10-02" />
        </section>
      </>,
    );

    const ids = [...container.querySelectorAll("[id]")].map((el) => el.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const testId of ["page", "dialog"]) {
      const scope = within(screen.getByTestId(testId));
      await user.click(scope.getByText("Amount"));
      expect(scope.getByLabelText("Amount")).toHaveFocus();
    }
  });

  it("marks only the page form's search box as the shortcut target when not editing", () => {
    const { container } = render(
      <>
        <TransactionEntryForm budgetId="b1" date="2026-10-02" />
        <TransactionEntryForm
          budgetId="b1"
          date="2026-10-02"
          existing={
            {
              id: "t1", budget_id: "b1", category_id: "cat-car", item_id: "item-petrol",
              date: "2026-10-02", amount: 100, rate: null, qty: null, person_id: null,
              notes: null, item: { id: "item-petrol", name: "Petrol", unit: null },
              category: car, person: null,
            } as never
          }
        />
      </>,
    );
    expect(container.querySelectorAll("[data-entry-search]")).toHaveLength(1);
  });
});

describe("TransactionEntryForm duplicate warning", () => {
  async function pickPetrol(user: ReturnType<typeof userEvent.setup>) {
    await user.type(search(), "Petr");
    await user.click(await screen.findByRole("button", { name: /Petrol/ }));
  }

  it("warns when the same item and amount were already logged that day, but still allows it", async () => {
    state.dayRows = [
      { id: "t1", item_id: "item-petrol", amount: 4250, item: { id: "item-petrol", name: "Petrol" } },
    ];
    const user = userEvent.setup();
    render(<TransactionEntryForm budgetId="b1" date="2026-10-02" />);

    await pickPetrol(user);
    await user.type(screen.getByLabelText("Amount"), "4250");

    expect(screen.getByRole("status")).toHaveTextContent("You already logged Petrol for 4,250.00");
    expect(screen.getByRole("button", { name: "Save & next" })).toBeEnabled();
  });

  it("stays quiet for a different amount", async () => {
    state.dayRows = [
      { id: "t1", item_id: "item-petrol", amount: 4250, item: { id: "item-petrol", name: "Petrol" } },
    ];
    const user = userEvent.setup();
    render(<TransactionEntryForm budgetId="b1" date="2026-10-02" />);

    await pickPetrol(user);
    await user.type(screen.getByLabelText("Amount"), "100");

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});

describe("TransactionEntryForm amount sums", () => {
  it("shows the result of a typed sum and settles it on blur", async () => {
    const user = userEvent.setup();
    render(<TransactionEntryForm budgetId="b1" date="2026-10-02" />);

    await user.type(search(), "Petr");
    await user.click(await screen.findByRole("button", { name: /Petrol/ }));
    const amount = screen.getByLabelText("Amount");
    await user.type(amount, "120+80");

    expect(screen.getByText("= 200")).toBeInTheDocument();
    await user.tab();
    expect(amount).toHaveValue("200");
    expect(screen.queryByText("= 200")).not.toBeInTheDocument();
  });

  it("saves the evaluated amount", async () => {
    const user = userEvent.setup();
    state.createTx.mutateAsync.mockResolvedValue(undefined);
    render(<TransactionEntryForm budgetId="b1" date="2026-10-02" />);

    await user.type(search(), "Petr");
    await user.click(await screen.findByRole("button", { name: /Petrol/ }));
    await user.type(screen.getByLabelText("Amount"), "450*3");
    await user.click(screen.getByRole("button", { name: "Save & next" }));

    expect(state.createTx.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 1350, itemId: "item-petrol" }),
    );
  });
});

describe("TransactionEntryForm item defaults", () => {
  it("prefills Amount with a lump-sum item's default and selects it for overwriting", async () => {
    state.items = [{ ...item("item-gym", "Gym fees"), default_mode: "lump", default_rate: 5000 }];
    const user = userEvent.setup();
    render(<TransactionEntryForm budgetId="b1" date="2026-10-02" />);

    await user.type(search(), "Gym");
    await user.click(await screen.findByRole("button", { name: /Gym fees/ }));

    const amount = screen.getByLabelText("Amount") as HTMLInputElement;
    expect(amount).toHaveValue("5000");
    await waitFor(() => expect(amount).toHaveFocus());

    await user.keyboard("6500");
    expect(amount).toHaveValue("6500");
  });

  it("leaves Amount empty for an item with no default", async () => {
    const user = userEvent.setup();
    render(<TransactionEntryForm budgetId="b1" date="2026-10-02" />);

    await user.type(search(), "Petr");
    await user.click(await screen.findByRole("button", { name: /Petrol/ }));

    expect(screen.getByLabelText("Amount")).toHaveValue("");
  });
});
