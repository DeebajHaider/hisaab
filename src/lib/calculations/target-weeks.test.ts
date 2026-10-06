import { describe, expect, it } from "vitest";
import { currentWeekIndex, daysBetween, spendByWeek, splitIntoWeeks } from "./target-weeks";

describe("daysBetween", () => {
  it("counts both ends", () => {
    expect(daysBetween("2026-10-01", "2026-10-01")).toBe(1);
    expect(daysBetween("2026-10-01", "2026-10-31")).toBe(31);
    expect(daysBetween("2026-02-01", "2026-02-28")).toBe(28);
  });
});

describe("splitIntoWeeks", () => {
  it("cuts a 31-day month into four full weeks and a 3-day fifth", () => {
    const weeks = splitIntoWeeks("2026-10-01", "2026-10-31", 20000);
    expect(weeks.map((w) => [w.index, w.start, w.end, w.days])).toEqual([
      [1, "2026-10-01", "2026-10-07", 7],
      [2, "2026-10-08", "2026-10-14", 7],
      [3, "2026-10-15", "2026-10-21", 7],
      [4, "2026-10-22", "2026-10-28", 7],
      [5, "2026-10-29", "2026-10-31", 3],
    ]);
  });

  it("shares the target out by days, so the short week gets a smaller limit", () => {
    const weeks = splitIntoWeeks("2026-10-01", "2026-10-31", 31000);
    expect(weeks.map((w) => w.limit)).toEqual([7000, 7000, 7000, 7000, 3000]);
  });

  it("always adds back up to the target, even when it does not divide evenly", () => {
    const weeks = splitIntoWeeks("2026-10-01", "2026-10-31", 20000);
    const total = weeks.reduce((sum, w) => Math.round((sum + w.limit) * 100) / 100, 0);
    expect(total).toBe(20000);
    expect(weeks[0].limit).toBeCloseTo(4516.12, 2);
  });

  it("makes a single week for a short period", () => {
    const weeks = splitIntoWeeks("2026-10-05", "2026-10-09", 500);
    expect(weeks).toHaveLength(1);
    expect(weeks[0]).toMatchObject({ days: 5, limit: 500 });
  });

  it("makes exactly four weeks for a 28-day February", () => {
    expect(splitIntoWeeks("2026-02-01", "2026-02-28", 2800)).toHaveLength(4);
  });

  it("is empty for an inverted range", () => {
    expect(splitIntoWeeks("2026-10-31", "2026-10-01", 100)).toEqual([]);
  });
});

describe("spendByWeek", () => {
  const weeks = splitIntoWeeks("2026-10-01", "2026-10-31", 20000);

  it("buckets amounts by the week their date falls in", () => {
    const rows = [
      { date: "2026-10-01", amount: 100 },
      { date: "2026-10-07", amount: 50.5 },
      { date: "2026-10-08", amount: 200 },
      { date: "2026-10-31", amount: 10 },
    ];
    expect(spendByWeek(weeks, rows)).toEqual([150.5, 200, 0, 0, 10]);
  });

  it("ignores rows outside the period and sums in cents", () => {
    const rows = [
      { date: "2026-09-30", amount: 999 },
      { date: "2026-10-02", amount: 0.1 },
      { date: "2026-10-02", amount: 0.2 },
    ];
    expect(spendByWeek(weeks, rows)).toEqual([0.3, 0, 0, 0, 0]);
  });
});

describe("currentWeekIndex", () => {
  const weeks = splitIntoWeeks("2026-10-01", "2026-10-31", 20000);

  it("finds the week containing today", () => {
    expect(currentWeekIndex(weeks, "2026-10-01")).toBe(1);
    expect(currentWeekIndex(weeks, "2026-10-14")).toBe(2);
    expect(currentWeekIndex(weeks, "2026-10-30")).toBe(5);
  });

  it("is null outside the period", () => {
    expect(currentWeekIndex(weeks, "2026-09-30")).toBeNull();
    expect(currentWeekIndex(weeks, "2026-11-01")).toBeNull();
  });
});
