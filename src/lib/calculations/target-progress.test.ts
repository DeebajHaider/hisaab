import { calculateProgress } from "./target-progress";

describe("calculateProgress", () => {
  it("is 'under' well below the target", () => {
    expect(calculateProgress(1000, 4000)).toEqual({ percent: 25, status: "under" });
  });

  it("is 'under' right up to the near-threshold", () => {
    const result = calculateProgress(3199, 4000);
    expect(result.percent).toBeCloseTo(79.975, 5);
    expect(result.status).toBe("under");
  });

  it("is 'near' at the 80% threshold", () => {
    expect(calculateProgress(3200, 4000)).toEqual({ percent: 80, status: "near" });
  });

  it("is 'near' just under 100%", () => {
    const result = calculateProgress(3999, 4000);
    expect(result.percent).toBeCloseTo(99.975, 5);
    expect(result.status).toBe("near");
  });

  it("is 'over' at exactly 100%", () => {
    expect(calculateProgress(4000, 4000)).toEqual({ percent: 100, status: "over" });
  });

  it("is 'over' and uncapped beyond 100%", () => {
    expect(calculateProgress(6000, 4000)).toEqual({ percent: 150, status: "over" });
  });

  it("is 'under' at zero spend", () => {
    expect(calculateProgress(0, 4000)).toEqual({ percent: 0, status: "under" });
  });
});
