// ---------------------------------------------------------------------------
// Transaction CSV export
//
// The mirror image of transaction-import.ts. Produces the exact narrow format
// the importer consumes (date,category,item,amount,rate,qty,notes), so an
// exported file round-trips: export -> parseCSV -> buildTransactionImportPlan
// yields the same data with no errors. That round-trip is pinned by tests.
// ---------------------------------------------------------------------------

/**
 * A transaction flattened for export. Category and item are denormalized to
 * their names (the CSV is name-based, not id-based) — the caller resolves the
 * joins when fetching. rate/qty/notes are null when absent.
 */
export interface ExportableTransaction {
  date: string; // YYYY-MM-DD
  categoryName: string;
  itemName: string;
  amount: number;
  rate: number | null;
  qty: number | null;
  notes: string | null;
}

/** The header row — identical to what buildTransactionImportPlan requires. */
const HEADER = ["date", "category", "item", "amount", "rate", "qty", "notes"];

/**
 * Serialize transactions to a CSV string.
 *
 * Always emits the header, even for an empty list (so an empty export is
 * still a valid, if rowless, CSV file). Rows are emitted in the order given —
 * the caller decides sorting.
 */
export function buildTransactionCSV(
  transactions: ExportableTransaction[],
): string {
  const lines = [HEADER.join(",")];

  for (const t of transactions) {
    lines.push(
      [
        esc(t.date),
        esc(t.categoryName),
        esc(t.itemName),
        esc(formatNumber(t.amount)),
        esc(t.rate === null ? "" : formatNumber(t.rate)),
        esc(t.qty === null ? "" : formatNumber(t.qty)),
        esc(t.notes ?? ""),
      ].join(","),
    );
  }

  // Trailing newline — conventional, and parseCSV tolerates it.
  return lines.join("\n") + "\n";
}

/**
 * Format a number for a CSV cell without locale separators or noise.
 * `Number.prototype.toString` gives the shortest exact representation:
 * 180 -> "180", 99.99 -> "99.99", 1.5 -> "1.5". No thousands separators,
 * which is essential — a comma would break the column structure, and the
 * importer parses cells with plain `Number()`.
 */
function formatNumber(n: number): string {
  return n.toString();
}

/**
 * Escape a single field for CSV output, RFC-4180 compatible with the
 * parseCSV tokenizer: a field is quoted if it contains a comma, a quote, or
 * a newline; interior quotes are doubled. A plain field is emitted as-is.
 */
function esc(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

