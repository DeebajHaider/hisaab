import { groupItemsByCategory } from "./tree-sort";
import type { Category } from "@/queries/use-categories";
import type { ItemWithCategory } from "@/queries/use-items";

// Helpers to build test fixtures with minimal noise
function makeCategory(overrides: Partial<Category>): Category {
  return {
    id: overrides.id ?? "cat-default",
    budget_id: "budget-1",
    name: "Default",
    sort_order: 0,
    color: null,
    tracks_person: false,
    is_archived: false,
    ...overrides,
  };
}

function makeItem(overrides: Partial<ItemWithCategory>): ItemWithCategory {
  return {
    id: overrides.id ?? "item-default",
    category_id: overrides.category_id ?? "cat-default",
    name: "Default item",
    unit: null,
    default_rate: null,
    default_mode: "lump",
    sort_order: 0,
    is_archived: false,
    category: {
      id: overrides.category_id ?? "cat-default",
      name: "Default",
      budget_id: "budget-1",
      tracks_person: false,
    },
    ...overrides,
  };
}

describe("groupItemsByCategory", () => {
  it("returns empty array for no categories", () => {
    expect(groupItemsByCategory([], [])).toEqual([]);
  });

  it("returns categories with empty items array when there are no items", () => {
    const cats = [makeCategory({ id: "a", name: "A" })];
    const result = groupItemsByCategory(cats, []);
    expect(result).toHaveLength(1);
    expect(result[0].category.id).toBe("a");
    expect(result[0].items).toEqual([]);
  });

  it("groups items under their categories", () => {
    const cats = [
      makeCategory({ id: "groc", name: "Groceries", sort_order: 0 }),
      makeCategory({ id: "veh", name: "Vehicle", sort_order: 1 }),
    ];
    const items = [
      makeItem({ id: "flour", name: "Flour", category_id: "groc" }),
      makeItem({ id: "petrol", name: "Petrol", category_id: "veh" }),
      makeItem({ id: "rice", name: "Rice", category_id: "groc" }),
    ];

    const result = groupItemsByCategory(cats, items);

    expect(result).toHaveLength(2);
    expect(result[0].category.id).toBe("groc");
    expect(result[0].items.map((i) => i.id)).toEqual(["flour", "rice"]);
    expect(result[1].category.id).toBe("veh");
    expect(result[1].items.map((i) => i.id)).toEqual(["petrol"]);
  });

  it("sorts categories by sort_order ascending", () => {
    const cats = [
      makeCategory({ id: "c", name: "C", sort_order: 5 }),
      makeCategory({ id: "a", name: "A", sort_order: 0 }),
      makeCategory({ id: "b", name: "B", sort_order: 2 }),
    ];
    const result = groupItemsByCategory(cats, []);
    expect(result.map((g) => g.category.id)).toEqual(["a", "b", "c"]);
  });

  it("sorts items within a category by sort_order", () => {
    const cats = [makeCategory({ id: "g", name: "Groceries" })];
    const items = [
      makeItem({ id: "z", name: "Z", category_id: "g", sort_order: 5 }),
      makeItem({ id: "a", name: "A", category_id: "g", sort_order: 0 }),
      makeItem({ id: "m", name: "M", category_id: "g", sort_order: 2 }),
    ];
    const result = groupItemsByCategory(cats, items);
    expect(result[0].items.map((i) => i.id)).toEqual(["a", "m", "z"]);
  });

  it("breaks sort_order ties alphabetically by name", () => {
    const cats = [
      makeCategory({ id: "z", name: "Zebra", sort_order: 0 }),
      makeCategory({ id: "a", name: "Apple", sort_order: 0 }),
    ];
    const result = groupItemsByCategory(cats, []);
    expect(result.map((g) => g.category.id)).toEqual(["a", "z"]);
  });

  it("ignores items whose category isn't in the list (orphans)", () => {
    // Edge case: stale data, archived category filtered out, etc.
    // Better to drop orphan items than to crash.
    const cats = [makeCategory({ id: "g", name: "Groceries" })];
    const items = [
      makeItem({ id: "valid", category_id: "g" }),
      makeItem({ id: "orphan", category_id: "deleted-cat" }),
    ];
    const result = groupItemsByCategory(cats, items);
    expect(result[0].items.map((i) => i.id)).toEqual(["valid"]);
  });
});