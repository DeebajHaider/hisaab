import { calculateHoldingProfit } from "./holding-profit";

describe("calculateHoldingProfit", () => {
  it("computes a gain in amount and percent", () => {
    expect(calculateHoldingProfit(25000, 37500)).toEqual({
      amount: 12500,
      percent: 50,
    });
  });

  it("computes a loss", () => {
    const result = calculateHoldingProfit(501000, 467000);
    expect(result.amount).toBe(-34000);
    expect(result.percent).toBeCloseTo(-6.786, 2);
  });

  it("handles a small fractional case like a real stock row", () => {
    const result = calculateHoldingProfit(2123.66, 2209.7);
    expect(result.amount).toBe(86.04);
    expect(result.percent).toBeCloseTo(4.05, 2);
  });

  it("returns zero profit when value equals investment", () => {
    expect(calculateHoldingProfit(100, 100)).toEqual({ amount: 0, percent: 0 });
  });

  it("does not divide by zero when there's no original investment", () => {
    expect(calculateHoldingProfit(0, 100)).toEqual({ amount: 100, percent: 0 });
  });

  it("stays float-safe (0.1 -> 0.3 is exactly 0.2)", () => {
    const result = calculateHoldingProfit(0.1, 0.3);
    expect(result.amount).toBe(0.2);
    expect(result.percent).toBe(200);
  });
});