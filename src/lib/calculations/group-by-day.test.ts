import { groupTransactionsByDay } from "./group-by-day";
import type { TransactionWithRelations } from "@/queries/use-transactions";

function makeTransaction(
  overrides: Partial<TransactionWithRelations> & { id: string; amount: number },
): TransactionWithRelations {
  return {
    budget_id: "budget-1",
    category_id: "cat-1",
    item_id: "item-1",
    person_id: null,
    date: "2026-05-05",
    rate: null,
    qty: null,
    notes: null,
    tags: [],
    created_by: "user-1",
    created_at: "2026-05-05T10:00:00Z",
    item: { id: "item-1", name: "Item", unit: null },
    category: { id: "cat-1", name: "Default Category", tracks_person: false },
    person: null,
    ...overrides,
  };
}

describe("groupTransactionsByDay", () => {
  it("returns empty array for no transactions", () => {
    expect(groupTransactionsByDay([])).toEqual([]);
  });

  it("groups transactions under their date", () => {
    const txs = [
      makeTransaction({ id: "1", amount: 100, date: "2026-05-05" }),
      makeTransaction({ id: "2", amount: 50, date: "2026-05-05" }),
      makeTransaction({ id: "3", amount: 200, date: "2026-05-06" }),
    ];

    const result = groupTransactionsByDay(txs);
    expect(result).toHaveLength(2);

    const may5 = result.find((g) => g.date === "2026-05-05");
    expect(may5?.transactions).toHaveLength(2);
    expect(may5?.subtotal).toBe(150);

    const may6 = result.find((g) => g.date === "2026-05-06");
    expect(may6?.transactions).toHaveLength(1);
    expect(may6?.subtotal).toBe(200);
  });

  it("orders days newest first", () => {
    const txs = [
      makeTransaction({ id: "1", amount: 1, date: "2026-05-04" }),
      makeTransaction({ id: "2", amount: 1, date: "2026-05-06" }),
      makeTransaction({ id: "3", amount: 1, date: "2026-05-05" }),
    ];
    const result = groupTransactionsByDay(txs);
    expect(result.map((g) => g.date)).toEqual([
      "2026-05-06",
      "2026-05-05",
      "2026-05-04",
    ]);
  });

  it("preserves transaction order within a day", () => {
    const txs = [
      makeTransaction({ id: "1", amount: 1, date: "2026-05-05" }),
      makeTransaction({ id: "2", amount: 2, date: "2026-05-05" }),
      makeTransaction({ id: "3", amount: 3, date: "2026-05-05" }),
    ];
    const result = groupTransactionsByDay(txs);
    expect(result[0].transactions.map((t) => t.id)).toEqual(["1", "2", "3"]);
  });

  it("handles fractional amounts without floating-point drift", () => {
    const txs = [
      makeTransaction({ id: "1", amount: 0.1, date: "2026-05-05" }),
      makeTransaction({ id: "2", amount: 0.2, date: "2026-05-05" }),
    ];
    const result = groupTransactionsByDay(txs);
    expect(result[0].subtotal).toBe(0.3);
  });
});
