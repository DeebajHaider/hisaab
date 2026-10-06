import { beforeEach, describe, expect, it } from "vitest";
import {
  normalizeName,
  readSavedFilters,
  removeFilter,
  upsertFilter,
  writeSavedFilters,
  type SavedLedgerFilter,
} from "./saved-ledger-filters";

const filter = (over: Partial<SavedLedgerFilter> = {}): SavedLedgerFilter => ({
  id: "f1",
  name: "Groceries",
  preset: "this-year",
  from: "2026-01-01",
  to: "2026-10-06",
  categoryIds: ["c1"],
  itemIds: [],
  personIds: [],
  search: "",
  ...over,
});

describe("upsertFilter", () => {
  it("appends a new name", () => {
    expect(upsertFilter([filter()], filter({ id: "f2", name: "Fuel" })).map((f) => f.name)).toEqual([
      "Groceries",
      "Fuel",
    ]);
  });

  it("replaces a filter with the same name, ignoring case, keeping its id", () => {
    const next = upsertFilter([filter()], filter({ id: "other", name: "groceries", search: "spar" }));
    expect(next).toHaveLength(1);
    expect(next[0].id).toBe("f1");
    expect(next[0].search).toBe("spar");
  });
});

describe("removeFilter", () => {
  it("drops by id", () => {
    expect(
      removeFilter([filter(), filter({ id: "f2", name: "Fuel" })], "f1").map((f) => f.id),
    ).toEqual(["f2"]);
  });
});

describe("normalizeName", () => {
  it("trims and caps the length", () => {
    expect(normalizeName("  Groceries  ")).toBe("Groceries");
    expect(normalizeName("x".repeat(100))).toHaveLength(40);
  });
});

describe("storage", () => {
  beforeEach(() => localStorage.clear());

  it("round-trips per user and budget", () => {
    writeSavedFilters("u1", "b1", [filter()]);
    expect(readSavedFilters("u1", "b1")).toEqual([filter()]);
    expect(readSavedFilters("u1", "b2")).toEqual([]);
    expect(readSavedFilters("u2", "b1")).toEqual([]);
  });

  it("drops malformed entries and survives corrupt storage", () => {
    localStorage.setItem("hisaab:ledger-filters:u1:b1", JSON.stringify([filter(), { id: 1 }]));
    expect(readSavedFilters("u1", "b1")).toEqual([filter()]);
    localStorage.setItem("hisaab:ledger-filters:u1:b1", "{nope");
    expect(readSavedFilters("u1", "b1")).toEqual([]);
  });
});
