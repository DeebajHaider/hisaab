import { describe, expect, it } from "vitest";
import type { ItemWithCategory } from "@/queries/use-items";
import { parseQuickEntry } from "./parse-quick-entry";

const item = (id: string, name: string): ItemWithCategory =>
  ({ id, name, category_id: "c", category: { id: "c", name: "Food", budget_id: "b", tracks_person: false } }) as ItemWithCategory;

const items = [item("chai", "Chai"), item("petrol", "Petrol"), item("gym", "Gym fees"), item("ice", "Ice cream")];
const TODAY = "2026-10-09";
const DAY = "2026-10-05";
const parse = (text: string) => parseQuickEntry(text, items, TODAY, DAY);

describe("parseQuickEntry", () => {
  it("reads an item and an amount, dating it to the day being viewed", () => {
    const r = parse("chai 120");
    expect(r).toMatchObject({ ok: true, amount: 120, date: DAY, tags: [] });
    expect(r.ok && r.item.id).toBe("chai");
  });

  it("matches loosely, by prefix or word", () => {
    expect(parse("pet 500")).toMatchObject({ ok: true });
    expect(parse("gym 5000")).toMatchObject({ ok: true });
  });

  it("matches a multi-word item name", () => {
    const r = parse("gym fees 5000");
    expect(r.ok && r.item.id).toBe("gym");
    expect(r).toMatchObject({ amount: 5000 });
  });

  it("accepts the amount first, thousands separators, sums and k shorthand", () => {
    expect(parse("120 chai")).toMatchObject({ ok: true, amount: 120 });
    expect(parse("petrol 4,250")).toMatchObject({ ok: true, amount: 4250 });
    expect(parse("chai 120+80")).toMatchObject({ ok: true, amount: 200 });
    expect(parse("gym 1.5k")).toMatchObject({ ok: true, amount: 1500 });
  });

  it("understands today, yesterday and an explicit date", () => {
    expect(parse("chai 120 today")).toMatchObject({ date: TODAY });
    expect(parse("chai 120 yesterday")).toMatchObject({ date: "2026-10-08" });
    expect(parse("chai 120 2026-09-01")).toMatchObject({ date: "2026-09-01" });
  });

  it("collects #tags, normalised and without duplicates", () => {
    expect(parse("chai 120 #Trip #work #trip")).toMatchObject({ ok: true, tags: ["trip", "work"] });
  });

  it("explains what is missing rather than guessing", () => {
    expect(parse("chai")).toEqual({ ok: false, reason: "Add an amount, like “chai 120”." });
    expect(parse("120")).toEqual({ ok: false, reason: "Start with the item, like “chai 120”." });
    expect(parse("zzz 50")).toEqual({ ok: false, reason: "No item matches “zzz”." });
    expect(parse("chai 0")).toEqual({ ok: false, reason: "The amount has to be more than zero." });
  });

  it("is quiet for empty input", () => {
    expect(parse("   ")).toEqual({ ok: false, reason: "" });
  });
});
