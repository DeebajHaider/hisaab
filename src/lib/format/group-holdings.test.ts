import { groupHoldingsByAssetClass } from "./group-holdings";
import type { AssetClass } from "@/queries/use-asset-classes";
import type { Holding } from "@/queries/use-holdings";

// Minimal fixtures — only the fields the grouping touches.
const ac = (id: string, name: string): AssetClass =>
  ({ id, name }) as AssetClass;
const hold = (id: string, name: string, assetClassId: string): Holding =>
  ({ id, name, asset_class_id: assetClassId }) as Holding;

describe("groupHoldingsByAssetClass", () => {
  const stocks = ac("a1", "Stocks");
  const gold = ac("a2", "Commodity");

  it("buckets holdings under their asset class, preserving class order", () => {
    const groups = groupHoldingsByAssetClass(
      [stocks, gold],
      [hold("h1", "HUBCO", "a1"), hold("h2", "1 Tola Gold", "a2")],
    );
    expect(groups.map((g) => g.assetClass.id)).toEqual(["a1", "a2"]);
    expect(groups[0].holdings.map((h) => h.id)).toEqual(["h1"]);
    expect(groups[1].holdings.map((h) => h.id)).toEqual(["h2"]);
  });

  it("sorts holdings by name within a group", () => {
    const groups = groupHoldingsByAssetClass(
      [stocks],
      [hold("h1", "Zeta", "a1"), hold("h2", "Alpha", "a1")],
    );
    expect(groups[0].holdings.map((h) => h.name)).toEqual(["Alpha", "Zeta"]);
  });

  it("keeps empty groups", () => {
    const groups = groupHoldingsByAssetClass([stocks, gold], []);
    expect(groups).toHaveLength(2);
    expect(groups.every((g) => g.holdings.length === 0)).toBe(true);
  });

  it("drops holdings whose asset class isn't in the list", () => {
    const groups = groupHoldingsByAssetClass(
      [stocks],
      [hold("h1", "Orphan", "missing")],
    );
    expect(groups[0].holdings).toHaveLength(0);
  });
});
