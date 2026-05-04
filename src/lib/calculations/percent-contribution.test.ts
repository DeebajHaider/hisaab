import { calculatePercentContribution } from "./percent-contribution.ts";

describe("calculatePercentContribution", () => {
  it("returns the percentage of a part relative to a total", () => {
    expect(calculatePercentContribution(250, 1000)).toBe(25);
  });

  it("rounds to two decimal places", () => {
    // 1/3 = 33.333...% → rounds to 33.33
    expect(calculatePercentContribution(1, 3)).toBe(33.33);
  });

  it("returns 0 when total is 0 (avoid division by zero)", () => {
    // Edge case: empty month, no expenses logged.
    // Return 0 instead of NaN/Infinity so the UI doesn't break.
    expect(calculatePercentContribution(0, 0)).toBe(0);
  });

  it("returns 0 when part is 0", () => {
    expect(calculatePercentContribution(0, 1000)).toBe(0);
  });

  it("returns 100 when part equals total", () => {
    expect(calculatePercentContribution(500, 500)).toBe(100);
  });

  it("throws for negative values (invalid input)", () => {
    // Spending and totals can't be negative.
    // Better to fail loudly than silently return nonsense.
    expect(() => calculatePercentContribution(-10, 100)).toThrow();
    expect(() => calculatePercentContribution(10, -100)).toThrow();
  });
});