import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BulkActionBar } from "./bulk-action-bar";
import type { TransactionWithRelations } from "@/queries/use-transactions";

const state = vi.hoisted(() => ({
  remove: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@/queries/use-bulk-transaction-mutations", () => ({
  useBulkDeleteTransactions: () => ({ mutate: state.remove, isPending: false }),
  useBulkUpdateTransactions: () => ({ mutate: state.update, isPending: false }),
}));

function row(id: string, tracks: boolean): TransactionWithRelations {
  return {
    id,
    person_id: null,
    category: { id: "c", name: "C", tracks_person: tracks },
  } as unknown as TransactionWithRelations;
}

const people = [{ id: "p1", name: "Sara", is_archived: false }] as never[];

beforeEach(() => {
  state.remove.mockReset();
  state.update.mockReset();
  Element.prototype.hasPointerCapture = vi.fn(() => false);
  Element.prototype.scrollIntoView = vi.fn();
});

describe("BulkActionBar", () => {
  it("shows how many are selected", () => {
    render(
      <BulkActionBar budgetId="b1" rows={[row("a", false), row("b", false)]} items={[]} people={people} onClear={vi.fn()} />,
    );
    expect(screen.getByText("2 selected")).toBeInTheDocument();
  });

  it("only offers Person when every selected row's category tracks people", () => {
    const { rerender } = render(
      <BulkActionBar budgetId="b1" rows={[row("a", true)]} items={[]} people={people} onClear={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: /Person/ })).toBeEnabled();

    rerender(
      <BulkActionBar budgetId="b1" rows={[row("a", true), row("b", false)]} items={[]} people={people} onClear={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: /Person/ })).toBeDisabled();
  });

  it("asks before deleting, then deletes exactly the selected rows and clears the selection", async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    const rows = [row("a", false), row("b", false)];
    state.remove.mockImplementation((_input, opts) => opts.onSuccess());
    render(<BulkActionBar budgetId="b1" rows={rows} items={[]} people={people} onClear={onClear} />);

    await user.click(screen.getByRole("button", { name: /^Delete$/ }));
    expect(state.remove).not.toHaveBeenCalled();
    expect(screen.getByText("Delete 2 transactions?")).toBeInTheDocument();

    await user.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Delete" }));
    expect(state.remove).toHaveBeenCalledWith({ budgetId: "b1", rows }, expect.any(Object));
    expect(onClear).toHaveBeenCalled();
  });
});
