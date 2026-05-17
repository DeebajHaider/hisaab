import type { ParsedCSV } from "./csv-parser";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A category that already exists in the budget. */
export interface ExistingCategory {
  id: string;
  name: string;
}

/** An item that already exists, carrying its parent category's id. */
export interface ExistingItem {
  id: string;
  name: string;
  categoryId: string;
}

/**
 * The taxonomy already in the database, passed in by the caller. Keeping this
 * an argument (rather than fetching inside) is what lets the function stay
 * pure and fully unit-testable — the mutation hook fetches and supplies it.
 */
export interface ImportContext {
  categories: ExistingCategory[];
  items: ExistingItem[];
}

/**
 * A reference to a category/item that is either already in the DB (resolved
 * to an id) or about to be auto-created (resolved to a name, the id comes
 * into existence only when the mutation runs).
 */
export type Ref =
  | { kind: "existing"; id: string }
  | { kind: "new"; name: string };

/** A single transaction ready to insert, with category/item resolved. */
export interface PlannedTransaction {
  date: string; // YYYY-MM-DD, validated
  amount: number; // > 0
  rate: number | null;
  qty: number | null;
  notes: string | null;
  categoryRef: Ref;
  itemRef: Ref;
}

/** A category to auto-create before the transactions insert. */
export interface CategoryToCreate {
  name: string;
}

/** An item to auto-create; needs its parent category created first. */
export interface ItemToCreate {
  name: string;
  categoryName: string; // parent — resolved to id at insert time
  default_mode: "lump" | "rate_qty";
}

/**
 * The full import plan. `categoriesToCreate` and `itemsToCreate` are ordered
 * so the mutation can execute them as-is: categories first, then items
 * (which depend on categories), then transactions.
 */
export interface TransactionImportPlan {
  categoriesToCreate: CategoryToCreate[];
  itemsToCreate: ItemToCreate[];
  transactions: PlannedTransaction[];
}

/** A row-numbered error. Row 1 = header; first data row = 2. */
export interface ImportError {
  row: number;
  message: string;
}

/**
 * Result of building a plan. Mirrors `BuildPlanResult` in template-import.ts:
 * `plan` is non-null only when `errors` is empty. The importer is
 * all-or-nothing — a single bad row blocks the whole file.
 */
export interface TransactionPlanResult {
  plan: TransactionImportPlan | null;
  errors: ImportError[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const REQUIRED_COLUMNS = ["date", "category", "item", "amount"] as const;

// ---------------------------------------------------------------------------
// buildTransactionImportPlan
// ---------------------------------------------------------------------------

/**
 * Validate a parsed transactions CSV against the existing taxonomy and build
 * an insertion plan. Collects every error; returns `plan: null` if any error
 * exists, so callers never import a partial file.
 *
 * The CSV shape (produced by scripts/convert-budget-csv.mjs):
 *   date, category, item, amount, rate, qty, notes
 * Only date/category/item/amount are required; rate/qty/notes are optional.
 */
export function buildTransactionImportPlan(
  parsed: ParsedCSV,
  context: ImportContext,
): TransactionPlanResult {
  const errors: ImportError[] = [];

  // --- Header validation ---------------------------------------------------
  const headerSet = new Set(parsed.headers.map((h) => h.toLowerCase()));
  for (const col of REQUIRED_COLUMNS) {
    if (!headerSet.has(col)) {
      errors.push({ row: 1, message: `Missing required column: ${col}` });
    }
  }
  // Header errors short-circuit — nothing below makes sense without columns.
  if (errors.length > 0) {
    return { plan: null, errors };
  }

  // An entirely empty file (header only) is an error — nothing to import.
  if (parsed.rows.length === 0) {
    return {
      plan: null,
      errors: [{ row: 1, message: "No transaction rows found in the file." }],
    };
  }

  // --- Resolution bookkeeping ---------------------------------------------
  // Existing taxonomy indexed by normalized name for case-insensitive lookup.
  const existingCategoryByName = new Map<string, ExistingCategory>();
  for (const c of context.categories) {
    existingCategoryByName.set(normalize(c.name), c);
  }
  // Items are keyed by "categoryId::itemName" — an item is only the same item
  // if it lives under the same category.
  const existingItemByKey = new Map<string, ExistingItem>();
  for (const it of context.items) {
    existingItemByKey.set(`${it.categoryId}::${normalize(it.name)}`, it);
  }

  // New categories discovered during the walk, keyed by normalized name.
  // Value preserves the first-seen display name.
  const newCategories = new Map<string, string>();
  // New items, keyed by "categoryNormName::itemNormName". Value tracks the
  // display names and whether any row for this item used rate+qty (drives
  // the inferred default_mode).
  const newItems = new Map<
    string,
    { name: string; categoryName: string; sawRateQty: boolean }
  >();

  const transactions: PlannedTransaction[] = [];

  /**
   * Record a to-be-created item (idempotently) and return its Ref. Tracks
   * whether any row for the item used rate+qty, to infer default_mode later.
   */
  function recordNewItem(
    catNorm: string,
    categoryName: string,
    itemNorm: string,
    itemName: string,
    rate: number | null,
    qty: number | null,
  ): Ref {
    const key = `${catNorm}::${itemNorm}`;
    const existing = newItems.get(key);
    if (existing) {
      // A later row might be the one that reveals rate_qty usage.
      if (rate !== null && qty !== null) existing.sawRateQty = true;
    } else {
      newItems.set(key, {
        name: itemName,
        categoryName,
        sawRateQty: rate !== null && qty !== null,
      });
    }
    return { kind: "new", name: newItems.get(key)!.name };
  }

  // --- Row walk ------------------------------------------------------------
  parsed.rows.forEach((row, idx) => {
    const rowNum = idx + 2; // +1 header, +1 for 1-indexing

    const dateRaw = (row.date ?? "").trim();
    const categoryName = (row.category ?? "").trim();
    const itemName = (row.item ?? "").trim();
    const amountRaw = (row.amount ?? "").trim();
    const rateRaw = (row.rate ?? "").trim();
    const qtyRaw = (row.qty ?? "").trim();
    const notesRaw = (row.notes ?? "").trim();

    // -- date --
    if (dateRaw === "") {
      errors.push({ row: rowNum, message: "date is required" });
      return;
    }
    if (!isValidISODate(dateRaw)) {
      errors.push({
        row: rowNum,
        message: `Invalid date "${dateRaw}". Expected a real calendar date as YYYY-MM-DD.`,
      });
      return;
    }

    // -- category / item presence --
    if (categoryName === "") {
      errors.push({ row: rowNum, message: "category is required" });
      return;
    }
    if (itemName === "") {
      errors.push({ row: rowNum, message: "item is required" });
      return;
    }

    // -- amount --
    if (amountRaw === "") {
      errors.push({ row: rowNum, message: "amount is required" });
      return;
    }
    const amount = Number(amountRaw);
    if (Number.isNaN(amount) || amount <= 0) {
      errors.push({
        row: rowNum,
        message: `Invalid amount "${amountRaw}". Must be a number greater than zero.`,
      });
      return;
    }

    // -- rate / qty: optional, but if present must be valid and paired --
    let rate: number | null = null;
    let qty: number | null = null;
    if (rateRaw !== "" || qtyRaw !== "") {
      if (rateRaw === "" || qtyRaw === "") {
        errors.push({
          row: rowNum,
          message:
            "rate and qty must be provided together — a row cannot have one without the other.",
        });
        return;
      }
      const r = Number(rateRaw);
      const q = Number(qtyRaw);
      if (Number.isNaN(r) || r < 0) {
        errors.push({
          row: rowNum,
          message: `Invalid rate "${rateRaw}". Must be a non-negative number.`,
        });
        return;
      }
      if (Number.isNaN(q) || q < 0) {
        errors.push({
          row: rowNum,
          message: `Invalid qty "${qtyRaw}". Must be a non-negative number.`,
        });
        return;
      }
      rate = r;
      qty = q;
    }

    // -- resolve the category --
    const catNorm = normalize(categoryName);
    const existingCat = existingCategoryByName.get(catNorm);
    let categoryRef: Ref;
    if (existingCat) {
      categoryRef = { kind: "existing", id: existingCat.id };
    } else {
      // New category — record it once, preserving first-seen display name.
      if (!newCategories.has(catNorm)) {
        newCategories.set(catNorm, categoryName);
      }
      categoryRef = { kind: "new", name: newCategories.get(catNorm)! };
    }

    // -- resolve the item (scoped to its category) --
    let itemRef: Ref;
    const itemNorm = normalize(itemName);
    if (existingCat) {
      const existingItem = existingItemByKey.get(
        `${existingCat.id}::${itemNorm}`,
      );
      if (existingItem) {
        itemRef = { kind: "existing", id: existingItem.id };
      } else {
        itemRef = recordNewItem(
          catNorm,
          categoryName,
          itemNorm,
          itemName,
          rate,
          qty,
        );
      }
    } else {
      // Category is new -> item is necessarily new too.
      itemRef = recordNewItem(
        catNorm,
        categoryName,
        itemNorm,
        itemName,
        rate,
        qty,
      );
    }

    transactions.push({
      date: dateRaw,
      amount,
      rate,
      qty,
      notes: notesRaw === "" ? null : notesRaw,
      categoryRef,
      itemRef,
    });
  });

  // All-or-nothing: any error blocks the whole import.
  if (errors.length > 0) {
    return { plan: null, errors };
  }

  // --- Assemble the plan ---------------------------------------------------
  const categoriesToCreate: CategoryToCreate[] = [
    ...newCategories.values(),
  ].map((name) => ({ name }));
  const itemsToCreate: ItemToCreate[] = [...newItems.values()].map((it) => ({
    name: it.name,
    categoryName: it.categoryName,
    default_mode: it.sawRateQty ? "rate_qty" : "lump",
  }));

  return {
    plan: { categoriesToCreate, itemsToCreate, transactions },
    errors: [],
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Normalize a name for case-insensitive, whitespace-insensitive matching. */
function normalize(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * True if `s` is a real calendar date in strict YYYY-MM-DD form.
 *
 * Uses local-timezone Date construction (never `new Date(string)`, which
 * parses as UTC) and round-trips the parts: constructing Feb 30 silently
 * rolls over to Mar 2, so we reject any input whose components don't survive
 * the round-trip. This is the timezone-safe approach used across the app.
 */
function isValidISODate(s: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const year = Number(m[1]);
  const month = Number(m[2]); // 1-12
  const day = Number(m[3]); // 1-31
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  // Round-trip: build the date locally and check the parts survived.
  const d = new Date(year, month - 1, day);
  return (
    d.getFullYear() === year &&
    d.getMonth() === month - 1 &&
    d.getDate() === day
  );
}
