import { describe, it, expect } from "vitest";
import {
  calculateMonthSummary,
  type MonthSummaryInput,
  type MonthMeta,
} from "./month-summary";

// Test data builders — keep tests readable.
function tx(overrides: Partial<MonthSummaryInput> = {}): MonthSummaryInput {
  return {
    amount: 100,
    category: { name: "Groceries", tracks_person: false },
    person: null,
    ...overrides,
  };
}

const meta = (overrides: Partial<MonthMeta> = {}): MonthMeta => ({
  yearMonth: "2026-05",
  totalDays: 31,
  daysElapsed: 31,
  ...overrides,
});

describe("calculateMonthSummary — totals", () => {
  it("sums amounts as a totalExpenses figure", () => {
    const result = calculateMonthSummary(
      [tx({ amount: 100 }), tx({ amount: 250 }), tx({ amount: 75.5 })],
      meta(),
    );
    expect(result.totalExpenses).toBe(425.5);
  });

  it("returns zero total for an empty list", () => {
    const result = calculateMonthSummary([], meta());
    expect(result.totalExpenses).toBe(0);
  });

  it("handles floating-point amounts without precision drift", () => {
    // Classic 0.1 + 0.2 problem — must not produce 0.30000000000000004.
    const result = calculateMonthSummary(
      [tx({ amount: 0.1 }), tx({ amount: 0.2 })],
      meta(),
    );
    expect(result.totalExpenses).toBe(0.3);
  });
});

describe("calculateMonthSummary — transaction count", () => {
  it("counts transactions", () => {
    const result = calculateMonthSummary(
      [tx(), tx(), tx(), tx()],
      meta(),
    );
    expect(result.transactionCount).toBe(4);
  });

  it("returns zero count for an empty list", () => {
    const result = calculateMonthSummary([], meta());
    expect(result.transactionCount).toBe(0);
  });
});

describe("calculateMonthSummary — average per day", () => {
  it("divides total by daysElapsed for current month (mid-month)", () => {
    // 1500 over 15 days elapsed = 100/day pacing
    const result = calculateMonthSummary(
      [tx({ amount: 1500 })],
      meta({ totalDays: 31, daysElapsed: 15 }),
    );
    expect(result.averagePerDay).toBe(100);
  });

  it("divides by full month days for a past month", () => {
    // For past months, daysElapsed === totalDays
    const result = calculateMonthSummary(
      [tx({ amount: 3100 })],
      meta({ totalDays: 31, daysElapsed: 31 }),
    );
    expect(result.averagePerDay).toBe(100);
  });

  it("returns zero average when daysElapsed is zero", () => {
    const result = calculateMonthSummary(
      [tx({ amount: 100 })],
      meta({ daysElapsed: 0 }),
    );
    expect(result.averagePerDay).toBe(0);
  });

  it("returns zero average for an empty list", () => {
    const result = calculateMonthSummary([], meta());
    expect(result.averagePerDay).toBe(0);
  });
});

describe("calculateMonthSummary — largest category", () => {
  it("identifies the category with the highest total", () => {
    const result = calculateMonthSummary(
      [
        tx({ amount: 100, category: { name: "Groceries", tracks_person: false } }),
        tx({ amount: 500, category: { name: "Bills", tracks_person: false } }),
        tx({ amount: 200, category: { name: "Groceries", tracks_person: false } }),
      ],
      meta(),
    );
    expect(result.largestCategory).toEqual({ name: "Bills", total: 500 });
  });

  it("returns null when there are no transactions", () => {
    const result = calculateMonthSummary([], meta());
    expect(result.largestCategory).toBeNull();
  });

  it("breaks ties alphabetically", () => {
    const result = calculateMonthSummary(
      [
        tx({ amount: 100, category: { name: "Zebra", tracks_person: false } }),
        tx({ amount: 100, category: { name: "Apple", tracks_person: false } }),
      ],
      meta(),
    );
    expect(result.largestCategory).toEqual({ name: "Apple", total: 100 });
  });

  it("handles transactions with no category gracefully", () => {
    // Defensive: if a transaction's category join is null (orphaned data),
    // it should be ignored from the largest-category calculation but still
    // counted in totals.
    const result = calculateMonthSummary(
      [
        // @ts-expect-error — testing defensive behavior with invalid shape
        tx({ amount: 50, category: null }),
        tx({ amount: 30, category: { name: "Groceries", tracks_person: false } }),
      ],
      meta(),
    );
    expect(result.totalExpenses).toBe(80);
    expect(result.largestCategory).toEqual({ name: "Groceries", total: 30 });
  });
});

describe("calculateMonthSummary — per-person totals", () => {
  it("returns an empty array when no tracked-category transactions exist", () => {
    const result = calculateMonthSummary(
      [
        tx({
          amount: 100,
          category: { name: "Groceries", tracks_person: false },
          person: null,
        }),
      ],
      meta(),
    );
    expect(result.perPerson).toEqual([]);
  });

  it("sums totals for each person across tracked categories", () => {
    const result = calculateMonthSummary(
      [
        tx({
          amount: 200,
          category: { name: "Pocket Money", tracks_person: true },
          person: { name: "Minhal" },
        }),
        tx({
          amount: 150,
          category: { name: "Pocket Money", tracks_person: true },
          person: { name: "Minhal" },
        }),
        tx({
          amount: 300,
          category: { name: "Clothes", tracks_person: true },
          person: { name: "Deebaj" },
        }),
      ],
      meta(),
    );
    expect(result.perPerson).toEqual([
      { name: "Deebaj", total: 300 },
      { name: "Minhal", total: 350 },
    ]);
  });

  it("groups missing person assignments under 'Unassigned'", () => {
    const result = calculateMonthSummary(
      [
        tx({
          amount: 200,
          category: { name: "Pocket Money", tracks_person: true },
          person: null,
        }),
        tx({
          amount: 100,
          category: { name: "Pocket Money", tracks_person: true },
          person: { name: "Minhal" },
        }),
      ],
      meta(),
    );
    expect(result.perPerson).toEqual([
      { name: "Minhal", total: 100 },
      { name: "Unassigned", total: 200 },
    ]);
  });

  it("ignores person assignments on non-tracked categories", () => {
    // If the category isn't tracks_person, even if a person_id sneaks in,
    // we don't roll it up — the contract is "per-person view tracks
    // tracked categories only".
    const result = calculateMonthSummary(
      [
        tx({
          amount: 500,
          category: { name: "Groceries", tracks_person: false },
          person: { name: "Minhal" },
        }),
      ],
      meta(),
    );
    expect(result.perPerson).toEqual([]);
  });

  it("sorts per-person totals alphabetically by name", () => {
    const result = calculateMonthSummary(
      [
        tx({
          amount: 100,
          category: { name: "Pocket Money", tracks_person: true },
          person: { name: "Minhal" },
        }),
        tx({
          amount: 100,
          category: { name: "Pocket Money", tracks_person: true },
          person: { name: "Batool" },
        }),
        tx({
          amount: 100,
          category: { name: "Pocket Money", tracks_person: true },
          person: { name: "Deebaj" },
        }),
      ],
      meta(),
    );
    expect(result.perPerson.map((p) => p.name)).toEqual([
      "Batool",
      "Deebaj",
      "Minhal",
    ]);
  });
});