import { describe, expect, it } from "vitest";
import type { TransactionWithRelations } from "@/queries/use-transactions";
import { findDuplicate } from "./find-duplicate";

const tx = (id: string, item_id: string, amount: number) =>
  ({ id, item_id, amount }) as TransactionWithRelations;

const day = [tx("a", "petrol", 4250), tx("b", "chai", 120.1)];

describe("findDuplicate", () => {
  it("finds the same item at the same amount", () => {
    expect(findDuplicate(day, { itemId: "petrol", amount: 4250 })?.id).toBe("a");
  });

  it("compares amounts to the cent, ignoring float noise", () => {
    expect(findDuplicate(day, { itemId: "chai", amount: 120.1 + 0.0000001 })?.id).toBe("b");
  });

  it("is not a duplicate when the amount or the item differs", () => {
    expect(findDuplicate(day, { itemId: "petrol", amount: 4000 })).toBeNull();
    expect(findDuplicate(day, { itemId: "tea", amount: 4250 })).toBeNull();
  });

  it("ignores the transaction being edited", () => {
    expect(findDuplicate(day, { itemId: "petrol", amount: 4250 }, "a")).toBeNull();
  });

  it("stays quiet until an item and a positive amount are entered", () => {
    expect(findDuplicate(day, { itemId: null, amount: 4250 })).toBeNull();
    expect(findDuplicate(day, { itemId: "petrol", amount: 0 })).toBeNull();
    expect(findDuplicate(day, { itemId: "petrol", amount: NaN })).toBeNull();
  });
});
