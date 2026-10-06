import { describe, expect, it } from "vitest";
import { isShortcutAvailable, shortcutPage, shortcutsForPath } from "./shortcut-catalog";

describe("shortcutPage", () => {
  it("recognises the budget pages that have their own shortcuts", () => {
    expect(shortcutPage("/app/budgets/b1/day/2026-10-06")).toBe("day");
    expect(shortcutPage("/app/budgets/b1/month/2026-10")).toBe("month");
    expect(shortcutPage("/app/budgets/b1/ledger")).toBe("ledger");
  });

  it("treats other budget pages as plain budget pages", () => {
    expect(shortcutPage("/app/budgets/b1/targets")).toBe("budget");
    expect(shortcutPage("/app/budgets/b1")).toBe("budget");
  });

  it("treats everything outside a budget as other", () => {
    expect(shortcutPage("/app")).toBe("other");
    expect(shortcutPage("/app/portfolio")).toBe("other");
    expect(shortcutPage("/app/settings")).toBe("other");
    expect(shortcutPage("/")).toBe("other");
  });
});

describe("isShortcutAvailable", () => {
  it("lets the palette and help work everywhere", () => {
    expect(isShortcutAvailable("palette", "other")).toBe(true);
    expect(isShortcutAvailable("help", "other")).toBe(true);
  });

  it("limits arrows and t to the Day and Month views", () => {
    for (const action of ["prev", "next", "today"] as const) {
      expect(isShortcutAvailable(action, "day")).toBe(true);
      expect(isShortcutAvailable(action, "month")).toBe(true);
      expect(isShortcutAvailable(action, "ledger")).toBe(false);
      expect(isShortcutAvailable(action, "budget")).toBe(false);
    }
  });

  it("limits / to the Ledger", () => {
    expect(isShortcutAvailable("search", "ledger")).toBe(true);
    expect(isShortcutAvailable("search", "day")).toBe(false);
  });

  it("limits budget navigation to inside a budget", () => {
    expect(isShortcutAvailable("new", "budget")).toBe(true);
    expect(isShortcutAvailable("go:month", "other")).toBe(false);
  });
});

describe("shortcutsForPath", () => {
  it("lists the page's own shortcuts first", () => {
    const groups = shortcutsForPath("/app/budgets/b1/day/2026-10-06");
    expect(groups.map((g) => g.heading)).toEqual(["On this page", "In a budget", "Anywhere"]);
    expect(groups[0].items.map((i) => i.label)).toContain("Previous day");
  });

  it("describes Month navigation in months", () => {
    const labels = shortcutsForPath("/app/budgets/b1/month/2026-10")[0].items.map((i) => i.label);
    expect(labels).toContain("Previous month");
  });

  it("only lists global shortcuts outside a budget", () => {
    expect(shortcutsForPath("/app/portfolio").map((g) => g.heading)).toEqual(["Anywhere"]);
  });
});
