import { describe, expect, it } from "vitest";
import { buildRecap } from "./month-recap";

const tx = (date: string, category: string, amount: number) => ({
  date,
  amount,
  category: { name: category },
});
const fmt = (n: number) => `Rs ${n}`;

const base = { totalDays: 31, format: fmt };

describe("buildRecap", () => {
  it("is empty with nothing logged yet", () => {
    expect(buildRecap({ ...base, current: [], previous: [], daysElapsed: 5 })).toEqual([]);
  });

  it("compares with the same stretch of last month, not all of it", () => {
    const lines = buildRecap({
      ...base,
      daysElapsed: 10,
      current: [tx("2026-10-02", "Food", 400)],
      previous: [
        tx("2026-09-03", "Food", 500), // inside the first 10 days
        tx("2026-09-25", "Food", 9000), // after day 10: must not count
      ],
    });
    expect(lines[0]).toEqual({
      tone: "good",
      text: "You've spent 20% less than this point last month (Rs 400 vs Rs 500).",
    });
  });

  it("flags higher spending as bad and equal spending as neutral", () => {
    const more = buildRecap({
      ...base,
      daysElapsed: 10,
      current: [tx("2026-10-02", "Food", 600)],
      previous: [tx("2026-09-02", "Food", 500)],
    });
    expect(more[0]).toMatchObject({ tone: "bad" });
    expect(more[0].text).toContain("20% more");

    const same = buildRecap({
      ...base,
      daysElapsed: 10,
      current: [tx("2026-10-02", "Food", 500)],
      previous: [tx("2026-09-02", "Food", 500)],
    });
    expect(same[0].tone).toBe("neutral");
  });

  it("names the category that moved the most", () => {
    const lines = buildRecap({
      ...base,
      daysElapsed: 10,
      current: [tx("2026-10-02", "Food", 300), tx("2026-10-03", "Car", 1000)],
      previous: [tx("2026-09-02", "Food", 500), tx("2026-09-03", "Car", 900)],
    });
    expect(lines.some((l) => l.text === "Food is down 40% (Rs 200 less).")).toBe(true);
  });

  it("names the biggest share of spending", () => {
    const lines = buildRecap({
      ...base,
      daysElapsed: 10,
      current: [tx("2026-10-02", "Rent", 750), tx("2026-10-03", "Food", 250)],
      previous: [],
    });
    expect(lines.map((l) => l.text)).toContain("Rent took the biggest share, 75% of spending.");
  });

  it("counts days with nothing logged and days logged", () => {
    const lines = buildRecap({
      ...base,
      daysElapsed: 10,
      current: [tx("2026-10-02", "Food", 1), tx("2026-10-02", "Car", 1), tx("2026-10-05", "Food", 1)],
      previous: [],
    });
    const texts = lines.map((l) => l.text);
    expect(texts).toContain("8 days with nothing logged so far.");
    expect(texts).toContain("Logged on 2 of 10 days.");
  });

  it("skips the comparison when there is no history to compare with", () => {
    const lines = buildRecap({
      ...base,
      daysElapsed: 10,
      current: [tx("2026-10-02", "Food", 1)],
      previous: [],
    });
    expect(lines.some((l) => l.text.includes("last month"))).toBe(false);
  });
});
