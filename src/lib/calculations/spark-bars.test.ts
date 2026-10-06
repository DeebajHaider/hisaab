import { describe, expect, it } from "vitest";
import { sparkBars } from "./spark-bars";

describe("sparkBars", () => {
  it("scales each month to the biggest one", () => {
    const bars = sparkBars(["2026-08", "2026-09", "2026-10"], {
      "2026-08": 50,
      "2026-09": 100,
      "2026-10": 25,
    });
    expect(bars.map((b) => b.height)).toEqual([0.5, 1, 0.25]);
  });

  it("treats months without data as zero", () => {
    const bars = sparkBars(["2026-09", "2026-10"], { "2026-10": 80 });
    expect(bars).toEqual([
      { yearMonth: "2026-09", total: 0, height: 0 },
      { yearMonth: "2026-10", total: 80, height: 1 },
    ]);
  });

  it("is flat when nothing was spent", () => {
    expect(sparkBars(["2026-10"], {}).map((b) => b.height)).toEqual([0]);
  });
});
