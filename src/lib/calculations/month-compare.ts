interface Spend {
  amount: number;
  category: { name: string } | null;
}

export interface CompareRow {
  category: string;
  a: number;
  b: number;
  /** a minus b. */
  diff: number;
  /** Change from b to a as a percent of b; null when b is zero. */
  percent: number | null;
}

const cents = (n: number) => Math.round(n * 100);

/** Spending per category in two periods, biggest swing first. */
export function compareCategories(a: Spend[], b: Spend[]): CompareRow[] {
  const totals = new Map<string, { a: number; b: number }>();
  const add = (list: Spend[], key: "a" | "b") => {
    for (const t of list) {
      if (!t.category) continue;
      const row = totals.get(t.category.name) ?? { a: 0, b: 0 };
      row[key] += cents(t.amount);
      totals.set(t.category.name, row);
    }
  };
  add(a, "a");
  add(b, "b");

  return [...totals.entries()]
    .map(([category, v]) => ({
      category,
      a: v.a / 100,
      b: v.b / 100,
      diff: (v.a - v.b) / 100,
      percent: v.b === 0 ? null : ((v.a - v.b) / v.b) * 100,
    }))
    .sort((x, y) => Math.abs(y.diff) - Math.abs(x.diff) || x.category.localeCompare(y.category));
}
