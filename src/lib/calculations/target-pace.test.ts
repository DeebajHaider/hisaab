import { describe, expect, it } from "vitest";
import { projectTargetPace } from "./target-pace";

const base = {
  spent: 10000,
  targetAmount: 30000,
  startDate: "2026-10-01",
  endDate: "2026-10-30",
};

describe("projectTargetPace", () => {
  it("projects a straight line to the end of the period", () => {
    // 10,000 in 10 days of a 30-day period -> 30,000.
    const pace = projectTargetPace({ ...base, today: "2026-10-10" });
    expect(pace?.projected).toBeCloseTo(30000);
    expect(pace?.projectedPercent).toBeCloseTo(100);
    expect(pace?.willExceed).toBe(false);
  });

  it("flags a pace that will overshoot", () => {
    const pace = projectTargetPace({ ...base, spent: 15000, today: "2026-10-10" });
    expect(pace?.projected).toBeCloseTo(45000);
    expect(pace?.projectedPercent).toBeCloseTo(150);
    expect(pace?.willExceed).toBe(true);
  });

  it("counts the first day of a period as day one", () => {
    const pace = projectTargetPace({ ...base, spent: 3000, today: "2026-10-03" });
    expect(pace?.projected).toBeCloseTo(30000);
  });

  it("is null before the period starts and after it ends", () => {
    expect(projectTargetPace({ ...base, today: "2026-09-30" })).toBeNull();
    expect(projectTargetPace({ ...base, today: "2026-10-31" })).toBeNull();
  });

  it("is null too early in the period to be meaningful", () => {
    expect(projectTargetPace({ ...base, today: "2026-10-02" })).toBeNull();
  });

  it("is null on the last day, when there is nothing left to project", () => {
    expect(projectTargetPace({ ...base, today: "2026-10-30" })).toBeNull();
  });

  it("is null when nothing is spent or the target is already exceeded", () => {
    expect(projectTargetPace({ ...base, spent: 0, today: "2026-10-10" })).toBeNull();
    expect(projectTargetPace({ ...base, spent: 30000, today: "2026-10-10" })).toBeNull();
  });

  it("works across a month boundary", () => {
    const pace = projectTargetPace({
      spent: 700,
      targetAmount: 2000,
      startDate: "2026-10-28",
      endDate: "2026-11-10", // 14 days
      today: "2026-11-03", // day 7
    });
    expect(pace?.projected).toBeCloseTo(1400);
  });
});
