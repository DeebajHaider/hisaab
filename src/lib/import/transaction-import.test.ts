import { parseCSV } from "./csv-parser";
import {
  buildTransactionImportPlan,
  type ImportContext,
} from "./transaction-import";

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

// A context standing in for what's already in the database. Item carries the
// id of its parent category so the resolver can verify category/item pairing.
const EMPTY_CONTEXT: ImportContext = { categories: [], items: [] };

// A context with some existing taxonomy: a "Groceries" category with a
// "Milk" item, and a "Vehicle" category with a "Fuel" item.
const POPULATED_CONTEXT: ImportContext = {
  categories: [
    { id: "cat-groc", name: "Groceries" },
    { id: "cat-veh", name: "Vehicle" },
  ],
  items: [
    { id: "item-milk", name: "Milk", categoryId: "cat-groc" },
    { id: "item-fuel", name: "Fuel", categoryId: "cat-veh" },
  ],
};

const HEADER = "date,category,item,amount,rate,qty,notes";

/** Build a CSV string from a header + body lines. */
function csv(...lines: string[]): string {
  return [HEADER, ...lines].join("\n") + "\n";
}

// ---------------------------------------------------------------------------
// Header validation
// ---------------------------------------------------------------------------

describe("buildTransactionImportPlan — headers", () => {
  it("rejects a CSV missing the date column", () => {
    const parsed = parseCSV("category,item,amount\nGroceries,Milk,100\n");
    const result = buildTransactionImportPlan(parsed, EMPTY_CONTEXT);
    expect(result.plan).toBeNull();
    expect(result.errors).toContainEqual({
      row: 1,
      message: "Missing required column: date",
    });
  });

  it("rejects a CSV missing the amount column", () => {
    const parsed = parseCSV("date,category,item\n2026-02-01,Groceries,Milk\n");
    const result = buildTransactionImportPlan(parsed, EMPTY_CONTEXT);
    expect(result.plan).toBeNull();
    expect(result.errors.some((e) => e.message.includes("amount"))).toBe(true);
  });

  it("accepts a CSV with all required columns and no optional ones", () => {
    const parsed = parseCSV(
      "date,category,item,amount\n2026-02-01,Groceries,Milk,100\n",
    );
    const result = buildTransactionImportPlan(parsed, EMPTY_CONTEXT);
    expect(result.errors).toEqual([]);
    expect(result.plan).not.toBeNull();
  });

  it("bails early when required columns are missing — no row errors reported", () => {
    // The body has a bad amount too, but header errors should short-circuit
    // before any row is examined.
    const parsed = parseCSV("date,category\n2026-02-01,Groceries\n");
    const result = buildTransactionImportPlan(parsed, EMPTY_CONTEXT);
    expect(result.plan).toBeNull();
    // Only header (row 1) errors, nothing from row 2.
    expect(result.errors.every((e) => e.row === 1)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Date validation
// ---------------------------------------------------------------------------

describe("buildTransactionImportPlan — dates", () => {
  it("rejects a non-ISO date format", () => {
    const parsed = parseCSV(csv("01/02/2026,Groceries,Milk,100,,,"));
    const result = buildTransactionImportPlan(parsed, EMPTY_CONTEXT);
    expect(result.plan).toBeNull();
    expect(result.errors).toContainEqual(
      expect.objectContaining({ row: 2 }),
    );
  });

  it("rejects an impossible calendar date (Feb 30)", () => {
    const parsed = parseCSV(csv("2026-02-30,Groceries,Milk,100,,,"));
    const result = buildTransactionImportPlan(parsed, EMPTY_CONTEXT);
    expect(result.plan).toBeNull();
    expect(result.errors[0].row).toBe(2);
  });

  it("rejects a blank date", () => {
    const parsed = parseCSV(csv(",Groceries,Milk,100,,,"));
    const result = buildTransactionImportPlan(parsed, EMPTY_CONTEXT);
    expect(result.plan).toBeNull();
    expect(
      result.errors.some((e) => e.message.toLowerCase().includes("date")),
    ).toBe(true);
  });

  it("accepts a valid leap-year date (Feb 29 2024)", () => {
    const parsed = parseCSV(csv("2024-02-29,Groceries,Milk,100,,,"));
    const result = buildTransactionImportPlan(parsed, EMPTY_CONTEXT);
    expect(result.errors).toEqual([]);
    expect(result.plan!.transactions[0].date).toBe("2024-02-29");
  });
});

// ---------------------------------------------------------------------------
// Amount / rate / qty validation
// ---------------------------------------------------------------------------

describe("buildTransactionImportPlan — amounts", () => {
  it("rejects a non-numeric amount", () => {
    const parsed = parseCSV(csv("2026-02-01,Groceries,Milk,abc,,,"));
    const result = buildTransactionImportPlan(parsed, EMPTY_CONTEXT);
    expect(result.plan).toBeNull();
    expect(result.errors[0].row).toBe(2);
  });

  it("rejects a zero or negative amount", () => {
    const parsed = parseCSV(
      csv("2026-02-01,Groceries,Milk,0,,,", "2026-02-02,Groceries,Milk,-50,,,"),
    );
    const result = buildTransactionImportPlan(parsed, EMPTY_CONTEXT);
    expect(result.plan).toBeNull();
    expect(result.errors.map((e) => e.row).sort()).toEqual([2, 3]);
  });

  it("accepts a decimal amount and preserves it float-safely", () => {
    const parsed = parseCSV(csv("2026-02-01,Groceries,Milk,99.99,,,"));
    const result = buildTransactionImportPlan(parsed, EMPTY_CONTEXT);
    expect(result.errors).toEqual([]);
    expect(result.plan!.transactions[0].amount).toBe(99.99);
  });

  it("rejects a row with rate but no qty (inconsistent pair)", () => {
    const parsed = parseCSV(csv("2026-02-01,Vehicle,Fuel,500,250,,"));
    const result = buildTransactionImportPlan(parsed, EMPTY_CONTEXT);
    expect(result.plan).toBeNull();
    expect(result.errors[0].row).toBe(2);
  });

  it("rejects a row with qty but no rate (inconsistent pair)", () => {
    const parsed = parseCSV(csv("2026-02-01,Vehicle,Fuel,500,,2,"));
    const result = buildTransactionImportPlan(parsed, EMPTY_CONTEXT);
    expect(result.plan).toBeNull();
    expect(result.errors[0].row).toBe(2);
  });

  it("accepts a row with both rate and qty", () => {
    const parsed = parseCSV(csv("2026-02-01,Vehicle,Fuel,500,250,2,"));
    const result = buildTransactionImportPlan(parsed, EMPTY_CONTEXT);
    expect(result.errors).toEqual([]);
    expect(result.plan!.transactions[0].rate).toBe(250);
    expect(result.plan!.transactions[0].qty).toBe(2);
  });

  it("accepts a row with neither rate nor qty (a lump transaction)", () => {
    const parsed = parseCSV(csv("2026-02-01,Groceries,Milk,100,,,"));
    const result = buildTransactionImportPlan(parsed, EMPTY_CONTEXT);
    expect(result.errors).toEqual([]);
    expect(result.plan!.transactions[0].rate).toBeNull();
    expect(result.plan!.transactions[0].qty).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Name resolution + auto-create
// ---------------------------------------------------------------------------

describe("buildTransactionImportPlan — name resolution", () => {
  it("resolves an existing category and item to their ids", () => {
    const parsed = parseCSV(csv("2026-02-01,Groceries,Milk,100,,,"));
    const result = buildTransactionImportPlan(parsed, POPULATED_CONTEXT);
    expect(result.errors).toEqual([]);
    expect(result.plan!.categoriesToCreate).toEqual([]);
    expect(result.plan!.itemsToCreate).toEqual([]);
    const tx = result.plan!.transactions[0];
    expect(tx.categoryRef).toEqual({ kind: "existing", id: "cat-groc" });
    expect(tx.itemRef).toEqual({ kind: "existing", id: "item-milk" });
  });

  it("matches names case-insensitively and trims whitespace", () => {
    const parsed = parseCSV(csv("2026-02-01,  groceries ,  MILK  ,100,,,"));
    const result = buildTransactionImportPlan(parsed, POPULATED_CONTEXT);
    expect(result.errors).toEqual([]);
    expect(result.plan!.categoriesToCreate).toEqual([]);
    expect(result.plan!.itemsToCreate).toEqual([]);
    expect(result.plan!.transactions[0].itemRef).toEqual({
      kind: "existing",
      id: "item-milk",
    });
  });

  it("flags a brand-new category for creation", () => {
    const parsed = parseCSV(csv("2026-02-01,Dining,Pizza,800,,,"));
    const result = buildTransactionImportPlan(parsed, POPULATED_CONTEXT);
    expect(result.errors).toEqual([]);
    expect(result.plan!.categoriesToCreate).toEqual([{ name: "Dining" }]);
  });

  it("flags a brand-new item under an existing category for creation", () => {
    const parsed = parseCSV(csv("2026-02-01,Groceries,Bread,90,,,"));
    const result = buildTransactionImportPlan(parsed, POPULATED_CONTEXT);
    expect(result.errors).toEqual([]);
    expect(result.plan!.categoriesToCreate).toEqual([]);
    expect(result.plan!.itemsToCreate).toEqual([
      {
        name: "Bread",
        categoryRef: { kind: "existing", id: "cat-groc" },
        default_mode: "lump",
      },
    ]);
  });

  it("creates an item only once even if it appears in many rows", () => {
    const parsed = parseCSV(
      csv(
        "2026-02-01,Groceries,Bread,90,,,",
        "2026-02-05,Groceries,Bread,95,,,",
        "2026-02-09,Groceries,Bread,88,,,",
      ),
    );
    const result = buildTransactionImportPlan(parsed, POPULATED_CONTEXT);
    expect(result.errors).toEqual([]);
    expect(result.plan!.itemsToCreate).toHaveLength(1);
    expect(result.plan!.transactions).toHaveLength(3);
  });

  it("infers rate_qty mode for an auto-created item that has rate+qty rows", () => {
    const parsed = parseCSV(csv("2026-02-01,Vehicle,Diesel,500,250,2,"));
    const result = buildTransactionImportPlan(parsed, POPULATED_CONTEXT);
    expect(result.errors).toEqual([]);
    expect(result.plan!.itemsToCreate).toEqual([
      {
        name: "Diesel",
        categoryRef: { kind: "existing", id: "cat-veh" },
        default_mode: "rate_qty",
      },
    ]);
  });

  it("infers lump mode for an auto-created item with no rate+qty rows", () => {
    const parsed = parseCSV(csv("2026-02-01,Dining,Pizza,800,,,"));
    const result = buildTransactionImportPlan(parsed, POPULATED_CONTEXT);
    expect(result.errors).toEqual([]);
    expect(result.plan!.itemsToCreate[0].default_mode).toBe("lump");
  });

  it("treats same item name under different categories as distinct items", () => {
    // "Other" under two different new categories — must create two items.
    const parsed = parseCSV(
      csv("2026-02-01,Dining,Other,100,,,", "2026-02-02,Misc,Other,200,,,"),
    );
    const result = buildTransactionImportPlan(parsed, POPULATED_CONTEXT);
    expect(result.errors).toEqual([]);
    expect(result.plan!.itemsToCreate).toHaveLength(2);
    expect(result.plan!.categoriesToCreate).toHaveLength(2);
  });

  it("gives a new-category item a 'new' categoryRef carrying the category name", () => {
    // Dining is brand-new; its item Pizza must reference the category by
    // name (no id exists yet), so the mutation can wire it after creating
    // the category.
    const parsed = parseCSV(csv("2026-02-01,Dining,Pizza,800,,,"));
    const result = buildTransactionImportPlan(parsed, POPULATED_CONTEXT);
    expect(result.errors).toEqual([]);
    expect(result.plan!.itemsToCreate).toEqual([
      {
        name: "Pizza",
        categoryRef: { kind: "new", name: "Dining" },
        default_mode: "lump",
      },
    ]);
  });

  it("does not duplicate a new category referenced by many rows", () => {
    const parsed = parseCSV(
      csv("2026-02-01,Dining,Pizza,800,,,", "2026-02-02,Dining,Burger,600,,,"),
    );
    const result = buildTransactionImportPlan(parsed, POPULATED_CONTEXT);
    expect(result.errors).toEqual([]);
    expect(result.plan!.categoriesToCreate).toEqual([{ name: "Dining" }]);
    expect(result.plan!.itemsToCreate).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// All-or-nothing guarantee
// ---------------------------------------------------------------------------

describe("buildTransactionImportPlan — all-or-nothing", () => {
  it("returns plan: null if even one row in a large file is bad", () => {
    const parsed = parseCSV(
      csv(
        "2026-02-01,Groceries,Milk,100,,,",
        "2026-02-02,Groceries,Milk,bad,,,", // the one bad row
        "2026-02-03,Groceries,Milk,120,,,",
      ),
    );
    const result = buildTransactionImportPlan(parsed, POPULATED_CONTEXT);
    expect(result.plan).toBeNull();
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].row).toBe(3); // 1 header + bad row is 2nd data row
  });

  it("collects every error across the file, not just the first", () => {
    const parsed = parseCSV(
      csv(
        "bad-date,Groceries,Milk,100,,,",
        "2026-02-02,Groceries,Milk,-5,,,",
        "2026-02-03,Groceries,Milk,abc,,,",
      ),
    );
    const result = buildTransactionImportPlan(parsed, POPULATED_CONTEXT);
    expect(result.plan).toBeNull();
    expect(result.errors).toHaveLength(3);
  });

  it("rejects an empty file (header only, no rows)", () => {
    const parsed = parseCSV(HEADER + "\n");
    const result = buildTransactionImportPlan(parsed, EMPTY_CONTEXT);
    expect(result.plan).toBeNull();
    expect(
      result.errors.some((e) =>
        e.message.toLowerCase().includes("no transaction"),
      ),
    ).toBe(true);
  });
});

