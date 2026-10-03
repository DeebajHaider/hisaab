import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TransactionList } from "./transaction-list";
import type { TransactionWithRelations } from "@/queries/use-transactions";

const tx = {
  id: "t1",
  budget_id: "b1",
  category_id: "c1",
  item_id: "i1",
  date: "2026-10-02",
  amount: 4250,
  rate: null,
  qty: null,
  person_id: null,
  notes: null,
  item: { id: "i1", name: "Petrol", unit: null },
  category: { id: "c1", name: "Car", tracks_person: false },
  person: null,
} as unknown as TransactionWithRelations;

describe("TransactionList row actions", () => {
  it("offers Edit, Log again and Delete, each acting on its own transaction", async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const onRepeat = vi.fn();
    const user = userEvent.setup();
    render(
      <TransactionList
        transactions={[tx]}
        currency="PKR"
        onEdit={onEdit}
        onDelete={onDelete}
        onRepeat={onRepeat}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Log again" }));
    expect(onRepeat).toHaveBeenCalledWith(tx);
    expect(onEdit).not.toHaveBeenCalled();
    expect(onDelete).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Edit" }));
    expect(onEdit).toHaveBeenCalledWith(tx);

    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(onDelete).toHaveBeenCalledWith(tx);
  });
});
