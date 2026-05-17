import { buildImportPlan, TEMPLATE_CSV_SAMPLE } from "./template-import";
import { parseCSV } from "./csv-parser";

describe("buildImportPlan", () => {
  describe("happy path", () => {
    it("groups items under their categories", () => {
      const result = buildImportPlan({
        headers: ["category", "item", "unit", "default_rate", "default_mode", "tracks_person"],
        rows: [
          { category: "Groceries", item: "Flour", unit: "Kg", default_rate: "180", default_mode: "rate_qty", tracks_person: "false" },
          { category: "Groceries", item: "Sugar", unit: "Kg", default_rate: "220", default_mode: "rate_qty", tracks_person: "false" },
          { category: "Vehicle", item: "Petrol", unit: "", default_rate: "", default_mode: "lump", tracks_person: "false" },
        ],
      });

      expect(result.errors).toEqual([]);
      expect(result.plan?.categories).toHaveLength(2);
      expect(result.plan?.categories[0]).toMatchObject({
        name: "Groceries",
        tracks_person: false,
      });
      expect(result.plan?.items).toHaveLength(3);
      expect(result.plan?.items[0]).toMatchObject({
        category_name: "Groceries",
        name: "Flour",
        unit: "Kg",
        default_rate: 180,
        default_mode: "rate_qty",
      });
    });

    it("preserves category order from first appearance", () => {
      const result = buildImportPlan({
        headers: ["category", "item"],
        rows: [
          { category: "Vehicle", item: "Petrol" },
          { category: "Groceries", item: "Flour" },
          { category: "Vehicle", item: "Maintenance" },
        ],
      });

      expect(result.plan?.categories.map((c) => c.name)).toEqual([
        "Vehicle",
        "Groceries",
      ]);
    });

    it("preserves item order within a category", () => {
      const result = buildImportPlan({
        headers: ["category", "item"],
        rows: [
          { category: "Groceries", item: "Flour" },
          { category: "Groceries", item: "Sugar" },
          { category: "Groceries", item: "Rice" },
        ],
      });

      expect(result.plan?.items.map((i) => i.name)).toEqual([
        "Flour",
        "Sugar",
        "Rice",
      ]);
    });
  });

  describe("optional columns", () => {
    it("works with only category and item", () => {
      const result = buildImportPlan({
        headers: ["category", "item"],
        rows: [{ category: "Groceries", item: "Flour" }],
      });
      expect(result.errors).toEqual([]);
      expect(result.plan?.items[0]).toMatchObject({
        name: "Flour",
        unit: null,
        default_rate: null,
        default_mode: "lump",
      });
    });

    it("treats empty optional fields as null/default", () => {
      const result = buildImportPlan({
        headers: ["category", "item", "unit", "default_rate"],
        rows: [{ category: "Groceries", item: "Flour", unit: "", default_rate: "" }],
      });
      expect(result.plan?.items[0]).toMatchObject({
        unit: null,
        default_rate: null,
      });
    });

    it("accepts case-insensitive boolean values for tracks_person", () => {
      const result = buildImportPlan({
        headers: ["category", "item", "tracks_person"],
        rows: [
          { category: "A", item: "x", tracks_person: "TRUE" },
          { category: "B", item: "y", tracks_person: "yes" },
          { category: "C", item: "z", tracks_person: "1" },
        ],
      });
      expect(result.plan?.categories.every((c) => c.tracks_person === true)).toBe(true);
    });
  });

  describe("validation errors", () => {
    it("errors when required columns are missing", () => {
      const result = buildImportPlan({
        headers: ["item"],
        rows: [{ item: "Flour" }],
      });
      expect(result.errors.some((e) => /category/i.test(e.message))).toBe(true);
    });

    it("errors on empty category name", () => {
      const result = buildImportPlan({
        headers: ["category", "item"],
        rows: [{ category: "", item: "Flour" }],
      });
      expect(result.errors[0]).toMatchObject({
        row: 2, // 1-indexed plus header
        message: expect.stringMatching(/category/i),
      });
    });

    it("errors on empty item name", () => {
      const result = buildImportPlan({
        headers: ["category", "item"],
        rows: [{ category: "Groceries", item: "" }],
      });
      expect(result.errors[0].message).toMatch(/item/i);
    });

    it("errors when same category has different tracks_person values", () => {
      const result = buildImportPlan({
        headers: ["category", "item", "tracks_person"],
        rows: [
          { category: "School", item: "Fees", tracks_person: "true" },
          { category: "School", item: "Books", tracks_person: "false" },
        ],
      });
      expect(result.errors.some((e) => /tracks_person/i.test(e.message))).toBe(true);
    });

    it("errors on duplicate item names within a category", () => {
      const result = buildImportPlan({
        headers: ["category", "item"],
        rows: [
          { category: "Groceries", item: "Flour" },
          { category: "Groceries", item: "Flour" },
        ],
      });
      expect(result.errors.some((e) => /duplicate/i.test(e.message))).toBe(true);
    });

    it("allows the same item name across different categories", () => {
      // "Pocket Money" the item under "Pocket Money" the category is fine
      const result = buildImportPlan({
        headers: ["category", "item"],
        rows: [
          { category: "Pocket Money", item: "Pocket Money" },
          { category: "Other", item: "Pocket Money" },
        ],
      });
      expect(result.errors).toEqual([]);
    });

    it("errors on invalid default_mode", () => {
      const result = buildImportPlan({
        headers: ["category", "item", "default_mode"],
        rows: [{ category: "A", item: "x", default_mode: "magic" }],
      });
      expect(result.errors[0].message).toMatch(/default_mode/i);
    });

    it("errors on negative default_rate", () => {
      const result = buildImportPlan({
        headers: ["category", "item", "default_rate"],
        rows: [{ category: "A", item: "x", default_rate: "-50" }],
      });
      expect(result.errors[0].message).toMatch(/default_rate/i);
    });

    it("errors on non-numeric default_rate", () => {
      const result = buildImportPlan({
        headers: ["category", "item", "default_rate"],
        rows: [{ category: "A", item: "x", default_rate: "abc" }],
      });
      expect(result.errors[0].message).toMatch(/default_rate/i);
    });

    it("collects multiple errors instead of throwing on the first", () => {
      const result = buildImportPlan({
        headers: ["category", "item", "default_mode"],
        rows: [
          { category: "", item: "Flour", default_mode: "lump" },
          { category: "Groceries", item: "Sugar", default_mode: "magic" },
        ],
      });
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    });
  });
});

describe("TEMPLATE_CSV_SAMPLE", () => {
  it("is a non-empty string with the expected header", () => {
    expect(TEMPLATE_CSV_SAMPLE).toContain(
      "category,item,unit,default_rate,default_mode,tracks_person",
    );
  });

  it("parses without errors", () => {
    // Sanity check: the example CSV we ship should be valid against our own parser
    // We import parseCSV here to keep the test self-contained.
    const parsed = parseCSV(TEMPLATE_CSV_SAMPLE);
    const result = buildImportPlan(parsed);
    expect(result.errors).toEqual([]);
  });
});