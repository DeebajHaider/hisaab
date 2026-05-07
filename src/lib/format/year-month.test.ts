import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  addMonths,
  formatMonthLabel,
  firstDayOfMonth,
  lastDayOfMonth,
  currentYearMonth,
} from "./year-month";

describe("addMonths", () => {
  it("adds one month within the same year", () => {
    expect(addMonths("2026-05", 1)).toBe("2026-06");
  });

  it("subtracts one month within the same year", () => {
    expect(addMonths("2026-05", -1)).toBe("2026-04");
  });

  it("rolls forward across a year boundary", () => {
    expect(addMonths("2026-12", 1)).toBe("2027-01");
  });

  it("rolls backward across a year boundary", () => {
    expect(addMonths("2026-01", -1)).toBe("2025-12");
  });

  it("returns the same month when adding zero", () => {
    expect(addMonths("2026-05", 0)).toBe("2026-05");
  });

  it("handles multi-year forward jumps", () => {
    // May 2026 + 14 months = July 2027
    expect(addMonths("2026-05", 14)).toBe("2027-07");
  });

  it("handles multi-year backward jumps", () => {
    // May 2026 - 17 months = December 2024
    expect(addMonths("2026-05", -17)).toBe("2024-12");
  });

  it("pads single-digit months with a leading zero", () => {
    expect(addMonths("2026-08", 1)).toBe("2026-09");
    expect(addMonths("2026-09", 1)).toBe("2026-10");
  });
});

describe("formatMonthLabel", () => {
  it("formats a month as 'Month YYYY'", () => {
    // Note: locale-dependent, but en-* locales all produce "May 2026".
    // If CI runs in a non-English locale this would need adjusting,
    // but Vitest uses the system locale and our dev environment is en.
    expect(formatMonthLabel("2026-05")).toBe("May 2026");
  });

  it("handles single-digit months correctly", () => {
    expect(formatMonthLabel("2026-01")).toBe("January 2026");
    expect(formatMonthLabel("2026-09")).toBe("September 2026");
  });

  it("handles December", () => {
    expect(formatMonthLabel("2026-12")).toBe("December 2026");
  });
});

describe("firstDayOfMonth", () => {
  it("returns the first day as YYYY-MM-01", () => {
    expect(firstDayOfMonth("2026-05")).toBe("2026-05-01");
  });

  it("works for January", () => {
    expect(firstDayOfMonth("2026-01")).toBe("2026-01-01");
  });

  it("works for December", () => {
    expect(firstDayOfMonth("2026-12")).toBe("2026-12-01");
  });
});

describe("lastDayOfMonth", () => {
  it("returns 31 for months with 31 days", () => {
    expect(lastDayOfMonth("2026-01")).toBe("2026-01-31");
    expect(lastDayOfMonth("2026-03")).toBe("2026-03-31");
    expect(lastDayOfMonth("2026-05")).toBe("2026-05-31");
    expect(lastDayOfMonth("2026-12")).toBe("2026-12-31");
  });

  it("returns 30 for months with 30 days", () => {
    expect(lastDayOfMonth("2026-04")).toBe("2026-04-30");
    expect(lastDayOfMonth("2026-06")).toBe("2026-06-30");
    expect(lastDayOfMonth("2026-09")).toBe("2026-09-30");
    expect(lastDayOfMonth("2026-11")).toBe("2026-11-30");
  });

  it("returns 28 for February in a non-leap year", () => {
    expect(lastDayOfMonth("2025-02")).toBe("2025-02-28");
  });

  it("returns 29 for February in a leap year (divisible by 4)", () => {
    expect(lastDayOfMonth("2024-02")).toBe("2024-02-29");
  });

  it("returns 29 for February in a leap year divisible by 400", () => {
    // 2000 is divisible by 400 — it IS a leap year.
    expect(lastDayOfMonth("2000-02")).toBe("2000-02-29");
  });

  it("returns 28 for February in a year divisible by 100 but not 400", () => {
    // 2100 is divisible by 100 but not 400 — it is NOT a leap year.
    expect(lastDayOfMonth("2100-02")).toBe("2100-02-28");
  });
});

describe("currentYearMonth", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the current year and month in YYYY-MM format", () => {
    // Pin to a known local date. Using Date constructor (year, month, day)
    // yields a local-timezone date, matching how todayISO works.
    vi.setSystemTime(new Date(2026, 4, 15)); // May 15, 2026 local
    expect(currentYearMonth()).toBe("2026-05");
  });

  it("handles January correctly", () => {
    vi.setSystemTime(new Date(2026, 0, 3)); // January 3, 2026 local
    expect(currentYearMonth()).toBe("2026-01");
  });

  it("handles December correctly", () => {
    vi.setSystemTime(new Date(2026, 11, 31)); // December 31, 2026 local
    expect(currentYearMonth()).toBe("2026-12");
  });
});