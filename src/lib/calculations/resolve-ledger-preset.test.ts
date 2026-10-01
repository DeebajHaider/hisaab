import { resolveLedgerPreset } from "./resolve-ledger-preset";

describe("resolveLedgerPreset", () => {
  it("this-month returns the 1st of the current month through today", () => {
    expect(resolveLedgerPreset("this-month", "2026-05-17", "2020-01-01")).toEqual({
      from: "2026-05-01",
      to: "2026-05-17",
    });
  });

  it("this-year returns Jan 1 of the current year through today", () => {
    expect(resolveLedgerPreset("this-year", "2026-05-17", "2020-01-01")).toEqual({
      from: "2026-01-01",
      to: "2026-05-17",
    });
  });

  it("last-12-months returns 11 months back (month-aligned) through today", () => {
    expect(resolveLedgerPreset("last-12-months", "2026-05-17", "2020-01-01")).toEqual({
      from: "2025-06-01",
      to: "2026-05-17",
    });
  });

  it("calendar presets are not clamped to earliest data — history shorter than the preset's span still yields the natural calendar start", () => {
    // Budget only has 3 months of history, but last-12-months should still
    // reach back a full year; the ledger query just returns fewer rows.
    // This is what makes each preset distinguishable from the others even
    // on a young budget — clamping collapsed them all into the same range.
    expect(resolveLedgerPreset("last-12-months", "2026-05-17", "2026-02-10")).toEqual({
      from: "2025-06-01",
      to: "2026-05-17",
    });
    expect(resolveLedgerPreset("this-year", "2026-05-17", "2026-02-10")).toEqual({
      from: "2026-01-01",
      to: "2026-05-17",
    });
  });

  it("all-time starts at the earliest transaction date", () => {
    expect(resolveLedgerPreset("all-time", "2026-05-17", "2022-03-09")).toEqual({
      from: "2022-03-09",
      to: "2026-05-17",
    });
  });

  it("all-time with no history defaults to today", () => {
    expect(resolveLedgerPreset("all-time", "2026-05-17", null)).toEqual({
      from: "2026-05-17",
      to: "2026-05-17",
    });
  });
});
