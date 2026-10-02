import { nextPeriod } from "./next-target-period";

describe("nextPeriod", () => {
  it("shifts a 7-day (weekly) range forward by its own length", () => {
    // Mon Oct 6 - Sun Oct 12 (7 days) -> Mon Oct 13 - Sun Oct 19
    expect(nextPeriod("2025-10-06", "2025-10-12")).toEqual({
      start: "2025-10-13",
      end: "2025-10-19",
    });
  });

  it("shifts a single-day range forward by one day", () => {
    expect(nextPeriod("2025-10-06", "2025-10-06")).toEqual({
      start: "2025-10-07",
      end: "2025-10-07",
    });
  });

  it("shifts a calendar-month range (30 days) forward to the same length", () => {
    // Nov 1 - Nov 30 (30 days) -> Dec 1 - Dec 30 (not Dec 31 - length preserved, not month-aligned)
    expect(nextPeriod("2025-11-01", "2025-11-30")).toEqual({
      start: "2025-12-01",
      end: "2025-12-30",
    });
  });

  it("handles a leap-year February correctly", () => {
    // 2028 is a leap year: Feb 1 - Feb 29 is 29 days
    expect(nextPeriod("2028-02-01", "2028-02-29")).toEqual({
      start: "2028-03-01",
      end: "2028-03-29",
    });
  });

  it("handles a year boundary", () => {
    expect(nextPeriod("2025-12-26", "2025-12-31")).toEqual({
      start: "2026-01-01",
      end: "2026-01-06",
    });
  });
});
