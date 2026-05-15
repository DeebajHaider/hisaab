import { describe, it, expect } from "vitest";
import {
  aggregateByMonth,
  type AggregateByMonthInput,
} from "./aggregate-by-month";

function tx(overrides: Partial<AggregateByMonthInput> = {}): AggregateByMonthInput {
  return {
    date: "2026-05-15",
    amount: 100,
    ...overrides,
  };
}

describe("aggregateByMonth", () => {
  it("returns empty array for empty input", () => {
    expect(aggregateByMonth([])).toEqual([]);
  });

  it("groups transactions by yearMonth and sums amounts", () => {
    const result = aggregateByMonth([
      tx({ date: "2026-05-10", amount: 100 }),
      tx({ date: "2026-05-22", amount: 50 }),
      tx({ date: "2026-06-01", amount: 200 }),
    ]);
    expect(result).toEqual([
      { yearMonth: "2026-05", total: 150 },
      { yearMonth: "2026-06", total: 200 },
    ]);
  });

  it("sorts chronologically regardless of input order", () => {
    const result = aggregateByMonth([
      tx({ date: "2026-06-01", amount: 100 }),
      tx({ date: "2026-04-15", amount: 100 }),
      tx({ date: "2026-05-15", amount: 100 }),
    ]);
    expect(result.map((r) => r.yearMonth)).toEqual([
      "2026-04",
      "2026-05",
      "2026-06",
    ]);
  });

  it("only includes months with data (no zero-fill)", () => {
    // Feb and April have data, March is empty.
    const result = aggregateByMonth([
      tx({ date: "2026-02-15", amount: 100 }),
      tx({ date: "2026-04-15", amount: 200 }),
    ]);
    expect(result).toEqual([
      { yearMonth: "2026-02", total: 100 },
      { yearMonth: "2026-04", total: 200 },
    ]);
  });

  it("handles a single transaction", () => {
    const result = aggregateByMonth([tx({ date: "2026-05-15", amount: 99 })]);
    expect(result).toEqual([{ yearMonth: "2026-05", total: 99 }]);
  });

  it("is float-safe via paisa-based arithmetic", () => {
    const result = aggregateByMonth([
      tx({ date: "2026-05-15", amount: 0.1 }),
      tx({ date: "2026-05-16", amount: 0.2 }),
    ]);
    expect(result[0].total).toBe(0.3);
  });

  it("handles transactions across multiple years", () => {
    const result = aggregateByMonth([
      tx({ date: "2024-12-31", amount: 100 }),
      tx({ date: "2025-01-01", amount: 200 }),
      tx({ date: "2026-06-15", amount: 300 }),
    ]);
    expect(result).toEqual([
      { yearMonth: "2024-12", total: 100 },
      { yearMonth: "2025-01", total: 200 },
      { yearMonth: "2026-06", total: 300 },
    ]);
  });
});
