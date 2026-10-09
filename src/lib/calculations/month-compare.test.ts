import { describe, expect, it } from "vitest";
import { compareCategories } from "./month-compare";

const tx = (name: string | null, amount: number) => ({
  amount,
  category: name ? { name } : null,
});

describe("compareCategories", () => {
  it("totals each category in both periods and the change between them", () => {
    const rows = compareCategories(
      [tx("Food", 300), tx("Food", 200), tx("Car", 100)],
      [tx("Food", 400), tx("Car", 100)],
    );
    const food = rows.find((r) => r.category === "Food")!;
    expect(food).toMatchObject({ a: 500, b: 400, diff: 100 });
    expect(food.percent).toBeCloseTo(25);
    expect(rows.find((r) => r.category === "Car")).toMatchObject({ diff: 0, percent: 0 });
  });

  it("includes categories that appear in only one period", () => {
    const rows = compareCategories([tx("Gym", 50)], [tx("Travel", 200)]);
    expect(rows.find((r) => r.category === "Gym")).toMatchObject({ a: 50, b: 0, percent: null });
    expect(rows.find((r) => r.category === "Travel")).toMatchObject({ a: 0, b: 200, diff: -200 });
  });

  it("orders by the size of the swing, either direction", () => {
    const rows = compareCategories(
      [tx("A", 110), tx("B", 0), tx("C", 500)],
      [tx("A", 100), tx("B", 300), tx("C", 100)],
    );
    expect(rows.map((r) => r.category)).toEqual(["C", "B", "A"]);
  });

  it("adds in cents so decimals do not drift, and skips uncategorised rows", () => {
    const rows = compareCategories([tx("X", 0.1), tx("X", 0.2), tx(null, 999)], []);
    expect(rows).toHaveLength(1);
    expect(rows[0].a).toBe(0.3);
  });
});
