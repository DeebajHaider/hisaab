import { describe, it, expect, vi, afterEach } from "vitest";
import { todayISO, toISODate, addDays, formatDayLabel } from "./date";

describe("toISODate", () => {
  it("formats a Date to YYYY-MM-DD using local timezone", () => {
    // Construct a date that's the same in any reasonable local zone:
    // June 15 2026 at noon local time
    const d = new Date(2026, 5, 15, 12, 0, 0); // months are 0-indexed: 5 = June
    expect(toISODate(d)).toBe("2026-06-15");
  });

  it("zero-pads single-digit months and days", () => {
    const d = new Date(2026, 0, 5, 12, 0, 0); // January 5
    expect(toISODate(d)).toBe("2026-01-05");
  });

  it("handles end-of-year correctly", () => {
    const d = new Date(2025, 11, 31, 23, 30, 0); // December 31, 11:30 PM
    expect(toISODate(d)).toBe("2025-12-31");
  });
});

describe("todayISO", () => {
  // We mock the Date so the test is deterministic.
  // Without this, the test would only pass on the day it was written.

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns today's date in YYYY-MM-DD format", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 5, 14, 30, 0)); // May 5, 2026, 2:30 PM
    expect(todayISO()).toBe("2026-05-05");
  });

  it("returns local-day even at the edges of a UTC day boundary", () => {
    vi.useFakeTimers();
    // Karachi is UTC+5. 2 AM in Karachi = 9 PM previous day in UTC.
    // We construct a Date that's May 5 at 2 AM local time.
    // The naive `new Date().toISOString().slice(0, 10)` would return May 4.
    vi.setSystemTime(new Date(2026, 4, 5, 2, 0, 0));
    expect(todayISO()).toBe("2026-05-05");
  });
});

describe("addDays", () => {
  it("adds positive days", () => {
    expect(addDays("2026-05-05", 1)).toBe("2026-05-06");
    expect(addDays("2026-05-05", 7)).toBe("2026-05-12");
  });

  it("subtracts with negative days", () => {
    expect(addDays("2026-05-05", -1)).toBe("2026-05-04");
    expect(addDays("2026-05-05", -5)).toBe("2026-04-30");
  });

  it("handles month boundaries", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("handles year boundaries", () => {
    expect(addDays("2025-12-31", 1)).toBe("2026-01-01");
    expect(addDays("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("handles leap years correctly", () => {
    // 2024 is a leap year; 2026 is not
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29");
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
  });
});

describe("formatDayLabel", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 'Today' for today's date", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 5, 12, 0, 0));
    expect(formatDayLabel("2026-05-05")).toBe("Today");
  });

  it("returns 'Yesterday' for yesterday", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 5, 12, 0, 0));
    expect(formatDayLabel("2026-05-04")).toBe("Yesterday");
  });

  it("returns 'Tomorrow' for tomorrow", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 5, 12, 0, 0));
    expect(formatDayLabel("2026-05-06")).toBe("Tomorrow");
  });

  it("formats other dates with weekday + month + day", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 5, 12, 0, 0));
    // 2026-04-30 is a Thursday in any locale; format may vary slightly
    const result = formatDayLabel("2026-04-30");
    expect(result).not.toBe("Today");
    expect(result).not.toBe("Yesterday");
    // Should at least contain Apr or 30
    expect(result.toLowerCase()).toMatch(/apr|30/);
  });
});
