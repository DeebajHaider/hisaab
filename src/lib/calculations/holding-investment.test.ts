import { applyAddInvestment, applyWithdrawal } from "./holding-investment";

describe("applyAddInvestment", () => {
  it("raises invested and value by the amount put in", () => {
    expect(applyAddInvestment(25000, 30000, 10000)).toEqual({
      invested: 35000,
      currentValue: 40000,
    });
  });

  it("stays float-safe", () => {
    expect(applyAddInvestment(0.1, 0.1, 0.1)).toEqual({
      invested: 0.2,
      currentValue: 0.2,
    });
  });
});

describe("applyWithdrawal", () => {
  it("lowers value by the amount and invested proportionally", () => {
    // 1/5 of a 30000 position taken out; invested drops by 1/5 too.
    expect(applyWithdrawal(25000, 30000, 6000)).toEqual({
      invested: 20000,
      currentValue: 24000,
    });
  });

  it("preserves the gain percentage", () => {
    // 50% gain before; still 50% after (750 - 500) / 500.
    const after = applyWithdrawal(1000, 1500, 750);
    expect(after).toEqual({ invested: 500, currentValue: 750 });
  });

  it("closes the position when withdrawing the full value", () => {
    expect(applyWithdrawal(25000, 30000, 30000)).toEqual({
      invested: 0,
      currentValue: 0,
    });
  });

  it("clamps an over-withdrawal to the full value", () => {
    expect(applyWithdrawal(25000, 30000, 999999)).toEqual({
      invested: 0,
      currentValue: 0,
    });
  });

  it("handles a worthless holding without dividing by zero", () => {
    expect(applyWithdrawal(25000, 0, 100)).toEqual({
      invested: 0,
      currentValue: 0,
    });
  });
});
