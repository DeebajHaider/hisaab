import { describe, expect, it } from "vitest";
import { buildCopies, buildRepeatDraft } from "./copy-transactions";
import type { TransactionWithRelations } from "@/queries/use-transactions";

function tx(overrides: Partial<TransactionWithRelations> = {}): TransactionWithRelations {
  return {
    id: "t1",
    budget_id: "b1",
    category_id: "cat-car",
    item_id: "item-petrol",
    date: "2026-10-02",
    amount: 4250,
    rate: 170,
    qty: 25,
    person_id: null,
    notes: "Highway trip",
    created_by: "u1",
    created_at: "2026-10-02T10:00:00Z",
    item: { id: "item-petrol", name: "Petrol", unit: "Ltr" },
    category: { id: "cat-car", name: "Car", tracks_person: false },
    person: null,
    ...overrides,
  } as TransactionWithRelations;
}

describe("buildCopies", () => {
  it("re-dates each transaction, with fresh ids, keeping what and how much", () => {
    let n = 0;
    const rows = buildCopies([tx(), tx({ id: "t2", amount: 500, rate: null, qty: null })], "2026-10-03", () => `new-${++n}`);

    expect(rows).toEqual([
      {
        id: "new-1",
        budget_id: "b1",
        category_id: "cat-car",
        item_id: "item-petrol",
        date: "2026-10-03",
        amount: 4250,
        rate: 170,
        qty: 25,
        person_id: null,
        notes: null,
      },
      {
        id: "new-2",
        budget_id: "b1",
        category_id: "cat-car",
        item_id: "item-petrol",
        date: "2026-10-03",
        amount: 500,
        rate: null,
        qty: null,
        person_id: null,
        notes: null,
      },
    ]);
  });

  it("keeps the person but never copies notes (they describe one occasion)", () => {
    const [row] = buildCopies([tx({ person_id: "p1", notes: "Birthday" })], "2026-10-03", () => "x");
    expect(row.person_id).toBe("p1");
    expect(row.notes).toBeNull();
  });

  it("returns nothing for nothing", () => {
    expect(buildCopies([], "2026-10-03", () => "x")).toEqual([]);
  });
});

describe("buildRepeatDraft", () => {
  it("turns a transaction into form fields as strings", () => {
    expect(buildRepeatDraft(tx())).toEqual({
      itemId: "item-petrol",
      categoryId: "cat-car",
      mode: "rate_qty",
      rate: "170",
      qty: "25",
      amount: "4250",
      personId: null,
    });
  });

  it("uses lump mode with blank rate and qty when the original had none", () => {
    const draft = buildRepeatDraft(tx({ rate: null, qty: null, amount: 1200.5, person_id: "p9" }));
    expect(draft).toMatchObject({ mode: "lump", rate: "", qty: "", amount: "1200.5", personId: "p9" });
  });
});
