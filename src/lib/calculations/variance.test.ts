import { describe, it, expect } from "vitest";
import { calculateVariance } from "./variance";

describe("calculateVariance", () => {
  it("computes income minus expenses minus savings", () => {
    expect(calculateVariance({ income: 5000, expenses: 3000, savings: 1000 }))
      .toBe(1000);
  });

  it("returns negative when expenses + savings exceed income", () => {
    expect(calculateVariance({ income: 2000, expenses: 1500, savings: 1000 }))
      .toBe(-500);
  });

  it("returns zero when income equals expenses plus savings", () => {
    expect(calculateVariance({ income: 1500, expenses: 1000, savings: 500 }))
      .toBe(0);
  });

  it("handles all-zero inputs", () => {
    expect(calculateVariance({ income: 0, expenses: 0, savings: 0 }))
      .toBe(0);
  });

  it("handles zero income with positive expenses (deep deficit)", () => {
    expect(calculateVariance({ income: 0, expenses: 500, savings: 0 }))
      .toBe(-500);
  });

  it("is float-safe via cents-based arithmetic", () => {
    // 0.1 + 0.2 - 0.3 should be exactly 0, not 5.5e-17
    expect(calculateVariance({ income: 0.3, expenses: 0.1, savings: 0.2 }))
      .toBe(0);
  });
});