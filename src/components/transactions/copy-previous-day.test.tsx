import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CopyPreviousDay } from "./copy-previous-day";

const state = vi.hoisted(() => ({
  data: [] as Record<string, unknown>[],
  mutate: vi.fn(),
}));

vi.mock("@/queries/use-transactions", () => ({
  useTransactions: () => ({ data: state.data }),
}));
vi.mock("@/queries/use-transaction-mutations", () => ({
  useCopyTransactions: () => ({ mutate: state.mutate, isPending: false }),
}));

const tx = (id: string, amount: number, notes: string | null = null) => ({
  id,
  budget_id: "b1",
  category_id: "c1",
  item_id: `i-${id}`,
  date: "2026-10-02",
  amount,
  rate: null,
  qty: null,
  person_id: null,
  notes,
});

beforeEach(() => {
  state.mutate.mockReset();
  state.data = [];
});

describe("CopyPreviousDay", () => {
  it("renders nothing when the previous day is empty", () => {
    const { container } = render(<CopyPreviousDay budgetId="b1" date="2026-10-03" currency="PKR" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("asks before copying, showing the count and total", async () => {
    state.data = [tx("a", 1000.5), tx("b", 250)];
    const user = userEvent.setup();
    render(<CopyPreviousDay budgetId="b1" date="2026-10-03" currency="PKR" />);

    await user.click(screen.getByRole("button", { name: /Copy 2 transactions from/ }));

    expect(await screen.findByText(/2 transactions totalling PKR 1,250.50/)).toBeInTheDocument();
    expect(state.mutate).not.toHaveBeenCalled();
  });

  it("copies the previous day's rows onto this date, without notes, once confirmed", async () => {
    state.data = [tx("a", 1000, "Birthday dinner")];
    const user = userEvent.setup();
    render(<CopyPreviousDay budgetId="b1" date="2026-10-03" currency="PKR" />);

    await user.click(screen.getByRole("button", { name: /Copy 1 transaction from/ }));
    await user.click(await screen.findByRole("button", { name: "Copy" }));

    expect(state.mutate).toHaveBeenCalledTimes(1);
    const { budgetId, rows } = state.mutate.mock.calls[0][0];
    expect(budgetId).toBe("b1");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      date: "2026-10-03",
      amount: 1000,
      item_id: "i-a",
      notes: null,
    });
    expect(rows[0].id).not.toBe("a");
  });

  it("does nothing if the dialog is cancelled", async () => {
    state.data = [tx("a", 1000)];
    const user = userEvent.setup();
    render(<CopyPreviousDay budgetId="b1" date="2026-10-03" currency="PKR" />);

    await user.click(screen.getByRole("button", { name: /Copy 1 transaction from/ }));
    await user.click(await screen.findByRole("button", { name: "Cancel" }));

    expect(state.mutate).not.toHaveBeenCalled();
  });
});
