import { beforeEach, describe, expect, it } from "vitest";
import type { Transaction } from "@/queries/use-transactions";
import {
  forgetDeleted,
  KEEP_DAYS,
  MAX_KEPT,
  pruneDeleted,
  readDeleted,
  recordDeleted,
  type DeletedRecord,
} from "./recently-deleted";

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 9, 6);

const tx = (id: string, over: Partial<Transaction> = {}) =>
  ({ id, budget_id: "b1", item_id: "i", category_id: "c", amount: 100, date: "2026-10-01", ...over }) as Transaction;

const rec = (id: string, ageDays: number): DeletedRecord => ({
  deletedAt: NOW - ageDays * DAY,
  row: tx(id),
  itemName: null,
  categoryName: null,
});

describe("pruneDeleted", () => {
  it("drops records older than the retention window and sorts newest first", () => {
    const out = pruneDeleted([rec("old", KEEP_DAYS + 1), rec("a", 5), rec("b", 1)], NOW);
    expect(out.map((r) => r.row.id)).toEqual(["b", "a"]);
  });

  it("keeps a record exactly at the limit", () => {
    expect(pruneDeleted([rec("edge", KEEP_DAYS)], NOW)).toHaveLength(1);
  });

  it("caps the list", () => {
    const many = Array.from({ length: MAX_KEPT + 10 }, (_, i) => rec(`r${i}`, 1 + i / 100));
    expect(pruneDeleted(many, NOW)).toHaveLength(MAX_KEPT);
  });
});

describe("stored deletions", () => {
  beforeEach(() => localStorage.clear());

  it("remembers names alongside the row, per user and budget", () => {
    recordDeleted(
      "u1",
      "b1",
      [{ ...tx("t1"), item: { name: "Petrol" }, category: { name: "Car" } }],
      NOW,
    );
    const [saved] = readDeleted("u1", "b1", NOW);
    expect(saved.row.id).toBe("t1");
    expect(saved.itemName).toBe("Petrol");
    expect(saved.categoryName).toBe("Car");
    expect("item" in saved.row).toBe(false);
    expect(readDeleted("u2", "b1", NOW)).toEqual([]);
    expect(readDeleted("u1", "b2", NOW)).toEqual([]);
  });

  it("does not duplicate a row deleted twice", () => {
    recordDeleted("u1", "b1", [tx("t1")], NOW);
    recordDeleted("u1", "b1", [tx("t1")], NOW + 1000);
    expect(readDeleted("u1", "b1", NOW + 1000)).toHaveLength(1);
  });

  it("forgets restored rows only", () => {
    recordDeleted("u1", "b1", [tx("t1"), tx("t2")], Date.now());
    forgetDeleted("u1", "b1", ["t1"]);
    expect(readDeleted("u1", "b1").map((r) => r.row.id)).toEqual(["t2"]);
  });

  it("survives corrupt storage and malformed entries", () => {
    localStorage.setItem("hisaab:deleted:u1:b1", "{nope");
    expect(readDeleted("u1", "b1", NOW)).toEqual([]);
    localStorage.setItem("hisaab:deleted:u1:b1", JSON.stringify([rec("ok", 1), { deletedAt: "x" }]));
    expect(readDeleted("u1", "b1", NOW).map((r) => r.row.id)).toEqual(["ok"]);
  });
});
