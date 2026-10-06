import { beforeEach, describe, expect, it } from "vitest";
import { pinnedFirst, readPinned, togglePinned, writePinned } from "./pinned-budgets";

const budgets = [{ id: "a" }, { id: "b" }, { id: "c" }];

describe("pinnedFirst", () => {
  it("puts pinned budgets first in pin order and keeps the rest as they were", () => {
    expect(pinnedFirst(budgets, ["c", "a"]).map((b) => b.id)).toEqual(["c", "a", "b"]);
  });

  it("ignores pins for budgets that no longer exist", () => {
    expect(pinnedFirst(budgets, ["gone", "b"]).map((b) => b.id)).toEqual(["b", "a", "c"]);
  });

  it("changes nothing when nothing is pinned", () => {
    expect(pinnedFirst(budgets, [])).toEqual(budgets);
  });
});

describe("togglePinned", () => {
  it("pins at the end, and unpins", () => {
    expect(togglePinned(["a"], "b")).toEqual(["a", "b"]);
    expect(togglePinned(["a", "b"], "a")).toEqual(["b"]);
  });
});

describe("stored pins", () => {
  beforeEach(() => localStorage.clear());

  it("are kept per user", () => {
    writePinned("u1", ["a"]);
    expect(readPinned("u1")).toEqual(["a"]);
    expect(readPinned("u2")).toEqual([]);
  });

  it("survive corrupt storage", () => {
    localStorage.setItem("hisaab:pinned-budgets:u1", "{nope");
    expect(readPinned("u1")).toEqual([]);
    localStorage.setItem("hisaab:pinned-budgets:u1", '{"a":1}');
    expect(readPinned("u1")).toEqual([]);
  });
});
