import { describe, expect, it } from "vitest";
import { describeTimeline, targetTimeline } from "./target-timeline";

const base = { targetAmount: 20000, startDate: "2026-10-01", endDate: "2026-10-31" };

describe("targetTimeline (active)", () => {
  it("counts today as elapsed and as a remaining day", () => {
    const t = targetTimeline({ ...base, spent: 5000, today: "2026-10-10" });
    expect(t).toMatchObject({ phase: "active", totalDays: 31, daysElapsed: 10, daysRemaining: 22 });
  });

  it("works out what can still be spent per remaining day", () => {
    const t = targetTimeline({ ...base, spent: 5000, today: "2026-10-10" });
    expect(t.remaining).toBe(15000);
    expect(t.perDayLeft).toBeCloseTo(15000 / 22);
    expect(t.avgPerDay).toBeCloseTo(500);
  });

  it("has no per-day allowance once the target is spent or exceeded", () => {
    expect(targetTimeline({ ...base, spent: 20000, today: "2026-10-10" }).perDayLeft).toBeNull();
    const over = targetTimeline({ ...base, spent: 22500, today: "2026-10-10" });
    expect(over.remaining).toBe(-2500);
    expect(over.perDayLeft).toBeNull();
  });

  it("has no average when nothing is spent", () => {
    expect(targetTimeline({ ...base, spent: 0, today: "2026-10-10" }).avgPerDay).toBeNull();
  });

  it("is on its last day at the end date, and on day one at the start", () => {
    expect(targetTimeline({ ...base, spent: 0, today: "2026-10-31" }).daysRemaining).toBe(1);
    const first = targetTimeline({ ...base, spent: 0, today: "2026-10-01" });
    expect(first.daysElapsed).toBe(1);
    expect(first.daysRemaining).toBe(31);
  });
});

describe("targetTimeline (not active)", () => {
  it("counts days until an upcoming target starts", () => {
    const t = targetTimeline({ ...base, spent: 0, today: "2026-09-28" });
    expect(t).toMatchObject({ phase: "upcoming", daysElapsed: 0, daysRemaining: 3 });
    expect(t.perDayLeft).toBeNull();
  });

  it("is ended after the end date, with its overall average", () => {
    const t = targetTimeline({ ...base, spent: 3100, today: "2026-11-05" });
    expect(t).toMatchObject({ phase: "ended", daysRemaining: 0 });
    expect(t.avgPerDay).toBeCloseTo(100);
  });
});

describe("describeTimeline", () => {
  const at = (today: string, spent = 0) =>
    describeTimeline(targetTimeline({ ...base, spent, today }), base.endDate, today);

  it("says how many days remain", () => {
    expect(at("2026-10-10")).toBe("22 days remaining");
    expect(at("2026-10-30")).toBe("2 days remaining");
  });

  it("calls out the last day", () => {
    expect(at("2026-10-31")).toBe("Last day");
  });

  it("describes upcoming and ended targets", () => {
    expect(at("2026-09-30")).toBe("Starts tomorrow");
    expect(at("2026-09-27")).toBe("Starts in 4 days");
    expect(at("2026-11-01")).toBe("Ended 1 day ago");
    expect(at("2026-11-05")).toBe("Ended 5 days ago");
  });
});
