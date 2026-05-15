import { describe, it, expect } from "vitest";
import { resolveTimeframe } from "./resolve-timeframe";

describe("resolveTimeframe", () => {
  it("1M returns just the current month", () => {
    expect(resolveTimeframe("1M", "2026-05", "2024-01")).toEqual({
      from: "2026-05",
      to: "2026-05",
    });
  });

  it("3M returns current month plus 2 preceding", () => {
    expect(resolveTimeframe("3M", "2026-05", "2024-01")).toEqual({
      from: "2026-03",
      to: "2026-05",
    });
  });

  it("6M returns current month plus 5 preceding", () => {
    expect(resolveTimeframe("6M", "2026-05", "2024-01")).toEqual({
      from: "2025-12",
      to: "2026-05",
    });
  });

  it("1Y returns 12 months ending at current", () => {
    expect(resolveTimeframe("1Y", "2026-05", "2020-01")).toEqual({
      from: "2025-06",
      to: "2026-05",
    });
  });

  it("3Y returns 36 months ending at current", () => {
    expect(resolveTimeframe("3Y", "2026-05", "2020-01")).toEqual({
      from: "2023-06",
      to: "2026-05",
    });
  });

  it("5Y returns 60 months ending at current", () => {
    expect(resolveTimeframe("5Y", "2026-05", "2020-01")).toEqual({
      from: "2021-06",
      to: "2026-05",
    });
  });

  it("All starts at the earliest transaction month", () => {
    expect(resolveTimeframe("All", "2026-05", "2024-03")).toEqual({
      from: "2024-03",
      to: "2026-05",
    });
  });

  it("All with null earliest defaults to just the current month", () => {
    expect(resolveTimeframe("All", "2026-05", null)).toEqual({
      from: "2026-05",
      to: "2026-05",
    });
  });

  it("clamps from to earliestMonth when timeframe exceeds available history", () => {
    // 5Y selected but data only goes back 8 months — clamp.
    expect(resolveTimeframe("5Y", "2026-05", "2025-09")).toEqual({
      from: "2025-09",
      to: "2026-05",
    });
  });

  it("does not clamp when earliest is older than the timeframe window", () => {
    // 3M selected and we have years of history — no clamp.
    expect(resolveTimeframe("3M", "2026-05", "2020-01")).toEqual({
      from: "2026-03",
      to: "2026-05",
    });
  });
});