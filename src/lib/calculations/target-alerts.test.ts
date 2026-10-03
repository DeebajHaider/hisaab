import { describe, expect, it } from "vitest";
import { selectTargetAlerts, type TargetWithSpent } from "./target-alerts";

function entry(
  id: string,
  spent: number,
  overrides: Partial<TargetWithSpent["target"]> = {},
): TargetWithSpent {
  return {
    target: {
      id,
      name: `Target ${id}`,
      target_amount: 1000,
      start_date: "2026-10-01",
      end_date: "2026-10-31",
      ...overrides,
    },
    spent,
  };
}

describe("selectTargetAlerts", () => {
  it("includes only targets at 80% or more", () => {
    const alerts = selectTargetAlerts(
      [entry("under", 799), entry("near", 800), entry("over", 1200)],
      "2026-10-15",
    );
    expect(alerts.map((a) => a.target.id)).toEqual(["over", "near"]);
  });

  it("reports the status and uncapped percent for each alert", () => {
    const [over, near] = selectTargetAlerts([entry("near", 900), entry("over", 1500)], "2026-10-15");
    expect(over).toMatchObject({ status: "over", percent: 150 });
    expect(near).toMatchObject({ status: "near", percent: 90 });
  });

  it("orders the most overspent first", () => {
    const alerts = selectTargetAlerts(
      [entry("a", 850), entry("b", 2000), entry("c", 1000)],
      "2026-10-15",
    );
    expect(alerts.map((a) => a.target.id)).toEqual(["b", "c", "a"]);
  });

  it("ignores targets whose period does not include the viewed date", () => {
    const alerts = selectTargetAlerts(
      [
        entry("past", 5000, { start_date: "2026-09-01", end_date: "2026-09-30" }),
        entry("future", 5000, { start_date: "2026-11-01", end_date: "2026-11-30" }),
        entry("current", 5000),
      ],
      "2026-10-15",
    );
    expect(alerts.map((a) => a.target.id)).toEqual(["current"]);
  });

  it("treats the first and last day of the period as inside it", () => {
    const e = entry("edge", 1000);
    expect(selectTargetAlerts([e], "2026-10-01")).toHaveLength(1);
    expect(selectTargetAlerts([e], "2026-10-31")).toHaveLength(1);
    expect(selectTargetAlerts([e], "2026-09-30")).toHaveLength(0);
    expect(selectTargetAlerts([e], "2026-11-01")).toHaveLength(0);
  });

  it("returns nothing when there are no targets", () => {
    expect(selectTargetAlerts([], "2026-10-15")).toEqual([]);
  });
});
