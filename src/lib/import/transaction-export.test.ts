import { parseCSV } from "./csv-parser";
import { buildTransactionImportPlan } from "./transaction-import";
import {
  buildTransactionCSV,
  type ExportableTransaction,
} from "./transaction-export";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** A minimal lump transaction. */
const lump = (over: Partial<ExportableTransaction> = {}): ExportableTransaction => ({
  date: "2026-02-01",
  categoryName: "Groceries",
  itemName: "Milk",
  amount: 180,
  rate: null,
  qty: null,
  notes: null,
  ...over,
});

const HEADER = "date,category,item,amount,rate,qty,notes";

// ---------------------------------------------------------------------------
// Header + basic shape
// ---------------------------------------------------------------------------

describe("buildTransactionCSV — shape", () => {
  it("emits the exact header the importer expects", () => {
    const csv = buildTransactionCSV([]);
    expect(csv.split("\n")[0]).toBe(HEADER);
  });

  it("emits a header even for an empty transaction list", () => {
    const csv = buildTransactionCSV([]);
    // Header line + trailing newline only.
    expect(csv).toBe(HEADER + "\n");
  });

  it("emits one row per transaction, in the given order", () => {
    const csv = buildTransactionCSV([
      lump({ date: "2026-02-01" }),
      lump({ date: "2026-02-02" }),
      lump({ date: "2026-02-03" }),
    ]);
    const lines = csv.trimEnd().split("\n");
    expect(lines).toHaveLength(4); // header + 3
    expect(lines[1].startsWith("2026-02-01")).toBe(true);
    expect(lines[3].startsWith("2026-02-03")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Field formatting
// ---------------------------------------------------------------------------

describe("buildTransactionCSV — fields", () => {
  it("writes a lump transaction with empty rate and qty", () => {
    const csv = buildTransactionCSV([lump()]);
    expect(csv.trimEnd().split("\n")[1]).toBe("2026-02-01,Groceries,Milk,180,,,");
  });

  it("writes rate and qty when present", () => {
    const csv = buildTransactionCSV([
      lump({ categoryName: "Vehicle", itemName: "Fuel", amount: 5000, rate: 250, qty: 20 }),
    ]);
    expect(csv.trimEnd().split("\n")[1]).toBe(
      "2026-02-01,Vehicle,Fuel,5000,250,20,",
    );
  });

  it("writes notes when present", () => {
    const csv = buildTransactionCSV([lump({ notes: "Weekly shop" })]);
    expect(csv.trimEnd().split("\n")[1]).toBe(
      "2026-02-01,Groceries,Milk,180,,,Weekly shop",
    );
  });

  it("preserves a decimal amount exactly", () => {
    const csv = buildTransactionCSV([lump({ amount: 99.99 })]);
    expect(csv.trimEnd().split("\n")[1]).toContain(",99.99,");
  });

  it("preserves a fractional qty exactly", () => {
    const csv = buildTransactionCSV([
      lump({ rate: 400, qty: 1.5, amount: 600 }),
    ]);
    const fields = csv.trimEnd().split("\n")[1].split(",");
    expect(fields[4]).toBe("400");
    expect(fields[5]).toBe("1.5");
  });
});

// ---------------------------------------------------------------------------
// CSV escaping — must round-trip through parseCSV
// ---------------------------------------------------------------------------

describe("buildTransactionCSV — escaping", () => {
  it("quotes a field containing a comma", () => {
    const csv = buildTransactionCSV([
      lump({ categoryName: "Meat, Vegetable & Fruit" }),
    ]);
    expect(csv).toContain('"Meat, Vegetable & Fruit"');
  });

  it("quotes and doubles interior quotes", () => {
    const csv = buildTransactionCSV([lump({ itemName: 'The "Special"' })]);
    expect(csv).toContain('"The ""Special"""');
  });

  it("quotes a field containing a newline", () => {
    const csv = buildTransactionCSV([lump({ notes: "line one\nline two" })]);
    expect(csv).toContain('"line one\nline two"');
  });

  it("leaves a plain field unquoted", () => {
    const csv = buildTransactionCSV([lump()]);
    expect(csv).not.toContain('"');
  });
});

// ---------------------------------------------------------------------------
// Round-trip: export -> parseCSV -> buildTransactionImportPlan
// ---------------------------------------------------------------------------

describe("buildTransactionCSV — round-trip with the importer", () => {
  it("an exported file re-parses to the same field values", () => {
    const txns = [
      lump({ date: "2026-02-01", amount: 180 }),
      lump({
        date: "2026-02-02",
        categoryName: "Vehicle",
        itemName: "Fuel",
        amount: 5000,
        rate: 250,
        qty: 20,
      }),
      lump({ notes: "with, comma" }),
    ];
    const csv = buildTransactionCSV(txns);
    const parsed = parseCSV(csv);

    expect(parsed.rows).toHaveLength(3);
    expect(parsed.rows[0].date).toBe("2026-02-01");
    expect(parsed.rows[1].category).toBe("Vehicle");
    expect(parsed.rows[1].rate).toBe("250");
    expect(parsed.rows[2].notes).toBe("with, comma");
  });

  it("an exported file is accepted by buildTransactionImportPlan with no errors", () => {
    const txns = [
      lump({ date: "2026-02-01" }),
      lump({
        date: "2026-02-02",
        categoryName: "Meat, Veg & Fruit",
        itemName: 'Beef "premium"',
        amount: 6800,
        rate: 1700,
        qty: 4,
      }),
    ];
    const csv = buildTransactionCSV(txns);
    const result = buildTransactionImportPlan(parseCSV(csv), {
      categories: [],
      items: [],
    });
    expect(result.errors).toEqual([]);
    expect(result.plan).not.toBeNull();
    expect(result.plan!.transactions).toHaveLength(2);
  });

  it("round-trips amount, rate, and qty as identical numbers", () => {
    const txns = [
      lump({ amount: 99.99, rate: 33.33, qty: 3 }),
    ];
    const csv = buildTransactionCSV(txns);
    const result = buildTransactionImportPlan(parseCSV(csv), {
      categories: [],
      items: [],
    });
    const tx = result.plan!.transactions[0];
    expect(tx.amount).toBe(99.99);
    expect(tx.rate).toBe(33.33);
    expect(tx.qty).toBe(3);
  });

  it("round-trips a transaction with no notes back to null notes", () => {
    const csv = buildTransactionCSV([lump({ notes: null })]);
    const result = buildTransactionImportPlan(parseCSV(csv), {
      categories: [],
      items: [],
    });
    expect(result.plan!.transactions[0].notes).toBeNull();
  });
});

