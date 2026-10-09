import { describe, expect, it } from "vitest";
import { buildHeatmap } from "./spending-heatmap";

describe("buildHeatmap", () => {
  it("lays October 2026 out Monday-first, padded to whole weeks", () => {
    // Oct 1, 2026 is a Thursday: three blanks, then the 1st.
    const weeks = buildHeatmap("2026-10", []);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    expect(weeks[0].slice(0, 3).map((c) => c.date)).toEqual([null, null, null]);
    expect(weeks[0][3].date).toBe("2026-10-01");
    expect(weeks.flat().filter((c) => c.date).length).toBe(31);
    expect(weeks.at(-1)!.at(-1)!.date).toBeNull();
  });

  it("starts the first week on the 1st when the month begins on a Monday", () => {
    // June 1, 2026 is a Monday.
    expect(buildHeatmap("2026-06", [])[0][0].date).toBe("2026-06-01");
  });

  it("handles February in a leap and a non-leap year", () => {
    expect(buildHeatmap("2024-02", []).flat().filter((c) => c.date).length).toBe(29);
    expect(buildHeatmap("2026-02", []).flat().filter((c) => c.date).length).toBe(28);
  });

  it("sums a day's spend and scales levels to the heaviest day", () => {
    const cells = buildHeatmap("2026-10", [
      { date: "2026-10-01", amount: 100 },
      { date: "2026-10-01", amount: 300 }, // 400 total: the heaviest
      { date: "2026-10-02", amount: 100 }, // a quarter of the max
      { date: "2026-10-03", amount: 200 }, // half
    ]).flat();
    const level = (d: string) => cells.find((c) => c.date === d)!;
    expect(level("2026-10-01")).toMatchObject({ total: 400, level: 4 });
    expect(level("2026-10-02").level).toBe(1);
    expect(level("2026-10-03").level).toBe(2);
    expect(level("2026-10-04").level).toBe(0);
  });

  it("is all level 0 when nothing was spent", () => {
    expect(buildHeatmap("2026-10", []).flat().every((c) => c.level === 0)).toBe(true);
  });
});
