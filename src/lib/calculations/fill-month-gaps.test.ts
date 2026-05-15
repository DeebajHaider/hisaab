import { describe, it, expect } from "vitest";
import { fillMonthGaps } from "./fill-month-gaps";
import type { MonthlyTotal } from "./aggregate-by-month";

describe("fillMonthGaps", () => {
  it("returns just the bounds when input is empty", () => {
    expect(fillMonthGaps([], "2026-03", "2026-05")).toEqual([
      { yearMonth: "2026-03", total: 0 },
      { yearMonth: "2026-04", total: 0 },
      { yearMonth: "2026-05", total: 0 },
    ]);
  });

  it("fills gap months with zero totals", () => {
    const sparse: MonthlyTotal[] = [
      { yearMonth: "2026-02", total: 100 },
      { yearMonth: "2026-04", total: 200 },
    ];
    expect(fillMonthGaps(sparse, "2026-01", "2026-05")).toEqual([
      { yearMonth: "2026-01", total: 0 },
      { yearMonth: "2026-02", total: 100 },
      { yearMonth: "2026-03", total: 0 },
      { yearMonth: "2026-04", total: 200 },
      { yearMonth: "2026-05", total: 0 },
    ]);
  });

  it("returns just the single month when from === to", () => {
    const sparse: MonthlyTotal[] = [{ yearMonth: "2026-05", total: 300 }];
    expect(fillMonthGaps(sparse, "2026-05", "2026-05")).toEqual([
      { yearMonth: "2026-05", total: 300 },
    ]);
  });

  it("preserves totals for months that have data", () => {
    const sparse: MonthlyTotal[] = [
      { yearMonth: "2026-01", total: 50 },
      { yearMonth: "2026-02", total: 75 },
    ];
    expect(fillMonthGaps(sparse, "2026-01", "2026-02")).toEqual([
      { yearMonth: "2026-01", total: 50 },
      { yearMonth: "2026-02", total: 75 },
    ]);
  });

  it("crosses year boundaries correctly", () => {
    const sparse: MonthlyTotal[] = [
      { yearMonth: "2025-12", total: 100 },
      { yearMonth: "2026-01", total: 200 },
    ];
    expect(fillMonthGaps(sparse, "2025-11", "2026-02")).toEqual([
      { yearMonth: "2025-11", total: 0 },
      { yearMonth: "2025-12", total: 100 },
      { yearMonth: "2026-01", total: 200 },
      { yearMonth: "2026-02", total: 0 },
    ]);
  });

  it("ignores input months outside the range", () => {
    // Defensive: if data exists outside the requested range, drop it.
    const sparse: MonthlyTotal[] = [
      { yearMonth: "2025-01", total: 999 }, // outside
      { yearMonth: "2026-03", total: 100 },
      { yearMonth: "2026-12", total: 999 }, // outside
    ];
    expect(fillMonthGaps(sparse, "2026-02", "2026-04")).toEqual([
      { yearMonth: "2026-02", total: 0 },
      { yearMonth: "2026-03", total: 100 },
      { yearMonth: "2026-04", total: 0 },
    ]);
  });
});