import { describe, expect, it } from "vitest";
import { calculateRates } from "./savings-rate";

describe("calculateRates", () => {
  it("works out the share kept and the share saved", () => {
    const r = calculateRates({ income: 100000, expenses: 70000, savings: 10000 });
    expect(r.keptPercent).toBeCloseTo(30);
    expect(r.savedPercent).toBeCloseTo(10);
  });

  it("goes negative when expenses exceed income", () => {
    expect(calculateRates({ income: 1000, expenses: 1500, savings: 0 }).keptPercent).toBeCloseTo(-50);
  });

  it("is null without income, rather than dividing by zero", () => {
    expect(calculateRates({ income: 0, expenses: 500, savings: 0 })).toEqual({
      keptPercent: null,
      savedPercent: null,
    });
  });
});
