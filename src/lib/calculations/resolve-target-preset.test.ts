import { resolveTargetPreset } from "./resolve-target-preset";

describe("resolveTargetPreset", () => {
  it("this-week resolves to Monday-Sunday when today is a Wednesday", () => {
    // 2025-10-08 is a Wednesday
    expect(resolveTargetPreset("this-week", "2025-10-08")).toEqual({
      start: "2025-10-06", // Monday
      end: "2025-10-12", // Sunday
    });
  });

  it("this-week resolves correctly when today is the Monday", () => {
    expect(resolveTargetPreset("this-week", "2025-10-06")).toEqual({
      start: "2025-10-06",
      end: "2025-10-12",
    });
  });

  it("this-week resolves correctly when today is the Sunday", () => {
    expect(resolveTargetPreset("this-week", "2025-10-12")).toEqual({
      start: "2025-10-06",
      end: "2025-10-12",
    });
  });

  it("this-week handles a month boundary", () => {
    // 2025-10-01 is a Wednesday; week is Sep 29 - Oct 5
    expect(resolveTargetPreset("this-week", "2025-10-01")).toEqual({
      start: "2025-09-29",
      end: "2025-10-05",
    });
  });

  it("this-month resolves to the 1st through the last day of the current month", () => {
    expect(resolveTargetPreset("this-month", "2025-02-14")).toEqual({
      start: "2025-02-01",
      end: "2025-02-28",
    });
  });

  it("this-month handles a leap-year February", () => {
    expect(resolveTargetPreset("this-month", "2028-02-14")).toEqual({
      start: "2028-02-01",
      end: "2028-02-29",
    });
  });
});
