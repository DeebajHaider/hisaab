import { describe, expect, it } from "vitest";
import { getStartSteps, isStartIncomplete } from "./getting-started";

describe("getStartSteps", () => {
  it("starts with nothing done for a brand-new budget", () => {
    const steps = getStartSteps({ categories: 0, items: 0, hasTransaction: false });
    expect(steps.map((s) => s.id)).toEqual(["category", "item", "transaction"]);
    expect(steps.every((s) => !s.done)).toBe(true);
  });

  it("marks steps off as they happen", () => {
    const steps = getStartSteps({ categories: 2, items: 0, hasTransaction: false });
    expect(steps.map((s) => s.done)).toEqual([true, false, false]);
  });

  it("is complete once everything is done", () => {
    const done = getStartSteps({ categories: 1, items: 1, hasTransaction: true });
    expect(isStartIncomplete(done)).toBe(false);
    expect(isStartIncomplete(getStartSteps({ categories: 1, items: 1, hasTransaction: false }))).toBe(true);
  });
});
