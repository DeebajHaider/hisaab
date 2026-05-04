import { describe, it, expect, vi, afterEach } from "vitest";
import { todayISO, toISODate } from "./date";

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