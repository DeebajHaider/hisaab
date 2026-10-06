import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RecentlyDeleted } from "./recently-deleted";
import { recordDeleted } from "@/lib/recently-deleted";
import type { Transaction } from "@/queries/use-transactions";

const state = vi.hoisted(() => ({ mutate: vi.fn() }));

vi.mock("@/queries/use-transaction-mutations", () => ({
  useRestoreDeleted: () => ({ mutate: state.mutate, isPending: false }),
}));

const row = {
  id: "t1",
  budget_id: "b1",
  item_id: "i1",
  category_id: "c1",
  date: "2026-09-12",
  amount: 4250,
} as Transaction;

beforeEach(() => {
  localStorage.clear();
  state.mutate.mockReset();
});

describe("RecentlyDeleted", () => {
  it("renders nothing when nothing was deleted", () => {
    const { container } = render(<RecentlyDeleted userId="u1" budgetId="b1" currency="PKR" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("lists deleted transactions behind a toggle and restores the one chosen", async () => {
    const user = userEvent.setup();
    recordDeleted("u1", "b1", [
      { ...row, item: { name: "Petrol" }, category: { name: "Car" } },
    ]);
    render(<RecentlyDeleted userId="u1" budgetId="b1" currency="PKR" />);

    expect(screen.queryByText("Petrol")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Recently deleted \(1\)/ }));
    expect(screen.getByText("Petrol")).toBeInTheDocument();
    expect(screen.getByText("PKR 4,250.00")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Restore/ }));
    expect(state.mutate).toHaveBeenCalledWith({
      userId: "u1",
      budgetId: "b1",
      row: expect.objectContaining({ id: "t1", amount: 4250 }),
    });
  });
});
