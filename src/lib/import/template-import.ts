import type { ParsedCSV } from "./csv-parser";

// What an import "plan" looks like — ready to feed into the bulk-insert mutation
export interface ImportPlan {
  categories: Array<{
    name: string;
    tracks_person: boolean;
  }>;
  items: Array<{
    category_name: string; // we resolve this to category_id at insert time
    name: string;
    unit: string | null;
    default_rate: number | null;
    default_mode: "lump" | "rate_qty";
  }>;
}

export interface ImportError {
  row: number; // 1-indexed, including header (so first data row is 2)
  message: string;
}

export interface BuildPlanResult {
  plan: ImportPlan | null;
  errors: ImportError[];
}

const REQUIRED_COLUMNS = ["category", "item"] as const;
const OPTIONAL_COLUMNS = [
  "unit",
  "default_rate",
  "default_mode",
  "tracks_person",
] as const;

/**
 * Convert a parsed CSV into a structured ImportPlan, collecting all errors.
 *
 * Errors do not throw — they accumulate in the result. Callers can decide
 * whether to surface partial results or block the import. We always do the
 * latter (don't import unless errors is empty).
 */
export function buildImportPlan(parsed: ParsedCSV): BuildPlanResult {
  const errors: ImportError[] = [];

  // Validate headers
  const headerSet = new Set(parsed.headers.map((h) => h.toLowerCase()));
  for (const col of REQUIRED_COLUMNS) {
    if (!headerSet.has(col)) {
      errors.push({
        row: 1,
        message: `Missing required column: ${col}`,
      });
    }
  }

  // Bail early if required columns missing — nothing else makes sense
  if (errors.length > 0) {
    return { plan: null, errors };
  }

  // Track categories as we encounter them, preserving order
  const categories: ImportPlan["categories"] = [];
  const categoryByName = new Map<string, ImportPlan["categories"][number]>();

  // Track items, also in order
  const items: ImportPlan["items"] = [];

  // Detect duplicates within a category
  const seenItemKeys = new Set<string>();

  parsed.rows.forEach((row, idx) => {
    const rowNum = idx + 2; // +1 for header, +1 for 1-indexing

    const categoryName = (row.category ?? "").trim();
    const itemName = (row.item ?? "").trim();

    if (!categoryName) {
      errors.push({ row: rowNum, message: "category is required" });
      return;
    }
    if (!itemName) {
      errors.push({ row: rowNum, message: "item is required" });
      return;
    }

    const tracksPerson = parseBool(row.tracks_person ?? "");

    // Category: create or check consistency
    const existing = categoryByName.get(categoryName);
    if (existing) {
      if (existing.tracks_person !== tracksPerson) {
        errors.push({
          row: rowNum,
          message: `Category "${categoryName}" has conflicting tracks_person values across rows`,
        });
        return;
      }
    } else {
      const cat = { name: categoryName, tracks_person: tracksPerson };
      categories.push(cat);
      categoryByName.set(categoryName, cat);
    }

    // Item: check for duplicate within this category
    const itemKey = `${categoryName}::${itemName}`;
    if (seenItemKeys.has(itemKey)) {
      errors.push({
        row: rowNum,
        message: `Duplicate item "${itemName}" in category "${categoryName}"`,
      });
      return;
    }
    seenItemKeys.add(itemKey);

    // Validate default_mode
    const modeStr = (row.default_mode ?? "").trim().toLowerCase() || "lump";
    if (modeStr !== "lump" && modeStr !== "rate_qty") {
      errors.push({
        row: rowNum,
        message: `Invalid default_mode "${row.default_mode}". Must be "lump" or "rate_qty".`,
      });
      return;
    }

    // Validate default_rate
    let defaultRate: number | null = null;
    const rateStr = (row.default_rate ?? "").trim();
    if (rateStr !== "") {
      const parsed = Number(rateStr);
      if (Number.isNaN(parsed) || parsed < 0) {
        errors.push({
          row: rowNum,
          message: `Invalid default_rate "${rateStr}". Must be a non-negative number.`,
        });
        return;
      }
      defaultRate = parsed;
    }

    const unit = (row.unit ?? "").trim() || null;

    items.push({
      category_name: categoryName,
      name: itemName,
      unit,
      default_rate: defaultRate,
      default_mode: modeStr as "lump" | "rate_qty",
    });
  });

  if (errors.length > 0) {
    return { plan: null, errors };
  }

  return { plan: { categories, items }, errors: [] };
}

/**
 * Lenient boolean parser: accepts true/false, yes/no, 1/0 in any case.
 * Empty string defaults to false.
 */
function parseBool(value: string): boolean {
  const v = value.trim().toLowerCase();
  return v === "true" || v === "yes" || v === "1";
}

/**
 * Sample CSV shipped with the app — shown as an example in the import dialog
 * and downloadable from there. Also the basis for the "Use default template" button.
 *
 * Designed to be:
 * - Generic enough for many family budgets
 * - Demonstrate every column type (lump, rate_qty, tracks_person, etc.)
 * - Small enough to read at a glance
 */
export const TEMPLATE_CSV_SAMPLE = `category,item,unit,default_rate,default_mode,tracks_person
Groceries,Flour,Kg,,rate_qty,false
Groceries,Sugar,Kg,,rate_qty,false
Groceries,Rice,Kg,,rate_qty,false
Groceries,Cooking Oil,Ltr,,rate_qty,false
Groceries,Milk,Ltr,,rate_qty,false
Groceries,Eggs,Dozen,,rate_qty,false
Fresh Produce,Vegetables,,,lump,false
Fresh Produce,Fruits,,,lump,false
Fresh Produce,Meat,Kg,,rate_qty,false
Vehicle,Fuel,Ltr,,rate_qty,false
Vehicle,Maintenance,,,lump,false
Vehicle,Parking & Tolls,,,lump,false
Utilities,Electricity,,,lump,false
Utilities,Internet,,,lump,false
Utilities,Phone Bill,,,lump,false
Health,Doctor Visit,,,lump,true
Health,Medication,,,lump,true
Education,School Fees,,,lump,true
Education,Books & Supplies,,,lump,true
Personal,Pocket Money,,,lump,true
Personal,Clothes,,,lump,true
Dining,Restaurants,,,lump,false
Dining,Takeout & Delivery,,,lump,false
Misc,Gifts,,,lump,false
Misc,Other,,,lump,false
`;