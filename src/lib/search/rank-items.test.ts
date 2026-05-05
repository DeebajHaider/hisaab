import { rankItems } from "./rank-items";
import type { ItemWithCategory } from "@/queries/use-items";
import type { RecentItemUsage } from "@/queries/use-recent-items";

// Test fixture helpers
function makeItem(overrides: Partial<ItemWithCategory> & { id: string; name: string }): ItemWithCategory {
  return {
    category_id: "cat-1",
    unit: null,
    default_rate: null,
    default_mode: "lump",
    sort_order: 0,
    is_archived: false,
    category: {
      id: "cat-1",
      name: "Default Category",
      budget_id: "budget-1",
      tracks_person: false,
    },
    ...overrides,
  };
}

function makeUsage(itemId: string, daysAgo: number, useCount: number = 1): RecentItemUsage {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return {
    itemId,
    lastUsedAt: date.toISOString(),
    useCount,
  };
}

describe("rankItems", () => {
  describe("empty query", () => {
    it("returns recent items first, then alphabetical for the rest", () => {
      const items = [
        makeItem({ id: "1", name: "Apple" }),
        makeItem({ id: "2", name: "Banana" }),
        makeItem({ id: "3", name: "Cherry" }),
        makeItem({ id: "4", name: "Date" }),
      ];
      const recent = [
        makeUsage("3", 1),  // Cherry used recently
        makeUsage("1", 5),  // Apple used 5 days ago
      ];

      const result = rankItems({ query: "", items, recent });

      // Recent first (most recent → least recent), then alphabetical for the rest
      expect(result.map((i) => i.id)).toEqual(["3", "1", "2", "4"]);
    });

    it("returns all items alphabetically when no recent usage", () => {
      const items = [
        makeItem({ id: "1", name: "Cherry" }),
        makeItem({ id: "2", name: "Apple" }),
        makeItem({ id: "3", name: "Banana" }),
      ];
      const result = rankItems({ query: "", items, recent: [] });
      expect(result.map((i) => i.name)).toEqual(["Apple", "Banana", "Cherry"]);
    });

    it("returns empty array for empty items", () => {
      expect(rankItems({ query: "", items: [], recent: [] })).toEqual([]);
    });
  });

  describe("prefix matching", () => {
    it("ranks prefix matches above substring matches", () => {
      const items = [
        makeItem({ id: "1", name: "Cooking Oil" }),  // "oil" is a substring
        makeItem({ id: "2", name: "Oil" }),          // "oil" is the full prefix
      ];
      const result = rankItems({ query: "oil", items, recent: [] });
      expect(result.map((i) => i.id)).toEqual(["2", "1"]);
    });

    it("matches prefix on any word in the name", () => {
      const items = [
        makeItem({ id: "1", name: "Sunflower Oil" }),
        makeItem({ id: "2", name: "Cooking Oil" }),
        makeItem({ id: "3", name: "Vinegar" }), // no match
      ];
      const result = rankItems({ query: "oil", items, recent: [] });
      // Both match: "Oil" as second word in "Cooking Oil", "Olive" as full prefix
      expect(result.map((i) => i.id).sort()).toEqual(["1", "2"]);
    });

    it("is case-insensitive", () => {
      const items = [
        makeItem({ id: "1", name: "FLOUR" }),
        makeItem({ id: "2", name: "flour" }),
      ];
      const result = rankItems({ query: "FLO", items, recent: [] });
      expect(result).toHaveLength(2);
    });

    it("trims whitespace from query", () => {
      const items = [makeItem({ id: "1", name: "Flour" })];
      expect(rankItems({ query: "  flour  ", items, recent: [] })).toHaveLength(1);
    });
  });

  describe("substring matching", () => {
    it("matches substrings within words", () => {
      const items = [makeItem({ id: "1", name: "Strawberries" })];
      const result = rankItems({ query: "berr", items, recent: [] });
      expect(result).toHaveLength(1);
    });

    it("excludes items with no match at all", () => {
      const items = [
        makeItem({ id: "1", name: "Flour" }),
        makeItem({ id: "2", name: "Sugar" }),
      ];
      const result = rankItems({ query: "xyz", items, recent: [] });
      expect(result).toEqual([]);
    });
  });

  describe("recency boost", () => {
    it("boosts recently-used items above equally-matched non-recent items", () => {
      const items = [
        makeItem({ id: "1", name: "Flour" }),
        makeItem({ id: "2", name: "Flowers" }),
      ];
      // Both match "flo" as prefix. Flowers used recently → ranks higher.
      const recent = [makeUsage("2", 1)];
      const result = rankItems({ query: "flo", items, recent });
      expect(result.map((i) => i.id)).toEqual(["2", "1"]);
    });

    it("does not promote a non-matching item just because it's recent", () => {
      const items = [
        makeItem({ id: "1", name: "Flour" }),
        makeItem({ id: "2", name: "Vehicle" }),
      ];
      const recent = [makeUsage("2", 1, 100)];  // very recent, very frequent
      const result = rankItems({ query: "flo", items, recent });
      // Vehicle doesn't match "flo" — must not appear regardless of recency
      expect(result.map((i) => i.id)).toEqual(["1"]);
    });
  });

  describe("frequency boost", () => {
    it("boosts frequently-used items above rarely-used ones with similar match", () => {
      const items = [
        makeItem({ id: "1", name: "Flour" }),
        makeItem({ id: "2", name: "Flowers" }),
      ];
      const recent = [
        makeUsage("1", 5, 1),    // 5 days ago, 1 use
        makeUsage("2", 5, 20),   // 5 days ago, 20 uses
      ];
      const result = rankItems({ query: "flo", items, recent });
      expect(result.map((i) => i.id)).toEqual(["2", "1"]);
    });

    it("favors recency over frequency when they conflict", () => {
      const items = [
        makeItem({ id: "1", name: "Flour" }),
        makeItem({ id: "2", name: "Flowers" }),
      ];
      const recent = [
        makeUsage("1", 0, 1),    // today, 1 use
        makeUsage("2", 30, 100), // a month ago, 100 uses
      ];
      const result = rankItems({ query: "flo", items, recent });
      expect(result.map((i) => i.id)).toEqual(["1", "2"]);
    });
  });

  describe("tie-breaking", () => {
    it("breaks ties alphabetically by name", () => {
      const items = [
        makeItem({ id: "1", name: "Zucchini" }),
        makeItem({ id: "2", name: "Apple" }),
        makeItem({ id: "3", name: "Mango" }),
      ];
      // Empty query, no recent — pure alphabetical
      const result = rankItems({ query: "", items, recent: [] });
      expect(result.map((i) => i.name)).toEqual(["Apple", "Mango", "Zucchini"]);
    });
  });

  describe("limit", () => {
    it("truncates to the specified limit", () => {
      const items = Array.from({ length: 20 }, (_, i) =>
        makeItem({ id: String(i), name: `Item ${i}` }),
      );
      const result = rankItems({ query: "", items, recent: [], limit: 5 });
      expect(result).toHaveLength(5);
    });

    it("default limit is 10", () => {
      const items = Array.from({ length: 20 }, (_, i) =>
        makeItem({ id: String(i), name: `Item ${i}` }),
      );
      const result = rankItems({ query: "", items, recent: [] });
      expect(result).toHaveLength(10);
    });
  });
});