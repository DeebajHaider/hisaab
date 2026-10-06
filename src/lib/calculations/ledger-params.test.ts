import { describe, expect, it } from "vitest";
import { buildLedgerHref, parseLedgerParams } from "./ledger-params";

describe("buildLedgerHref", () => {
  it("links to the budget's ledger with the category and range", () => {
    expect(
      buildLedgerHref("b1", { categoryId: "c1", from: "2026-10-01", to: "2026-10-31" }),
    ).toBe("/app/budgets/b1/ledger?category=c1&from=2026-10-01&to=2026-10-31");
  });
});

describe("parseLedgerParams", () => {
  it("reads the category and dates back", () => {
    const params = new URLSearchParams("category=c1,c2&from=2026-10-01&to=2026-10-31");
    expect(parseLedgerParams(params)).toEqual({
      from: "2026-10-01",
      to: "2026-10-31",
      categoryIds: ["c1", "c2"],
      itemIds: [],
    });
  });

  it("builds and reads an item filter", () => {
    const href = buildLedgerHref("b1", { itemId: "i1", from: "2026-01-01", to: "2026-10-06" });
    expect(href).toBe("/app/budgets/b1/ledger?item=i1&from=2026-01-01&to=2026-10-06");
    expect(parseLedgerParams(new URLSearchParams(href.split("?")[1])).itemIds).toEqual(["i1"]);
  });

  it("round-trips what buildLedgerHref produces", () => {
    const href = buildLedgerHref("b1", { categoryId: "c1", from: "2026-10-01", to: "2026-10-31" });
    const parsed = parseLedgerParams(new URLSearchParams(href.split("?")[1]));
    expect(parsed.categoryIds).toEqual(["c1"]);
    expect(parsed.from).toBe("2026-10-01");
  });

  it("drops malformed dates and handles an empty query", () => {
    expect(parseLedgerParams(new URLSearchParams("from=yesterday&to=2026-13"))).toEqual({
      from: undefined,
      to: undefined,
      categoryIds: [],
      itemIds: [],
    });
    expect(parseLedgerParams(new URLSearchParams(""))).toEqual({
      from: undefined,
      to: undefined,
      categoryIds: [],
      itemIds: [],
    });
  });
});
