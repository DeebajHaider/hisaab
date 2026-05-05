export interface ParsedCSV {
  headers: string[];
  rows: Record<string, string>[];
}

/**
 * Parse a CSV string into headers + rows.
 *
 * Implements the relevant subset of RFC 4180:
 * - Comma-delimited
 * - Optional quoted fields (with "" escaping)
 * - Quoted fields can contain commas and newlines
 * - Outer whitespace on values is trimmed
 * - Strips leading BOM
 * - Empty rows are skipped (not errors)
 * - Inconsistent column counts ARE errors
 *
 * For our import use case, this is more than sufficient. If we ever need
 * fancier features (alternate delimiters, streaming), switch to papaparse.
 */
export function parseCSV(input: string): ParsedCSV {
  // Strip BOM if present
  const text = input.startsWith("\uFEFF") ? input.slice(1) : input;

  if (!text.trim()) {
    throw new Error("CSV is empty");
  }

  // Tokenize into rows of fields, respecting quotes.
  // We do this character-by-character because regex-based approaches break
  // on quoted fields with embedded commas/newlines.
  const allRows = tokenize(text);

  // First non-empty row is the header
  const headers = allRows[0].map((h) => h.trim());

  // Subsequent rows are data; skip rows that are entirely empty
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < allRows.length; i++) {
    const fields = allRows[i];

    // Skip blank lines (a row of one empty field is how blank lines tokenize)
    if (fields.length === 1 && fields[0].trim() === "") continue;

    if (fields.length !== headers.length) {
      throw new Error(
        `Row ${i + 1} has ${fields.length} columns, expected ${headers.length} (column count mismatch)`,
      );
    }

    const obj: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = fields[j].trim();
    }
    rows.push(obj);
  }

  return { headers, rows };
}

/**
 * Convert raw CSV text into a 2D array of strings.
 * Handles quoting, embedded commas, embedded newlines, and escaped quotes.
 */
function tokenize(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;

  let i = 0;
  while (i < text.length) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        // Escaped quote: "" → literal "
        currentField += '"';
        i += 2;
        continue;
      }
      if (char === '"') {
        // End of quoted field
        inQuotes = false;
        i++;
        continue;
      }
      // Any other char (including comma, newline) is part of the field
      currentField += char;
      i++;
      continue;
    }

    // Not in quotes
    if (char === '"' && currentField === "") {
      // Start of a quoted field (only at the start of a field, per RFC)
      inQuotes = true;
      i++;
      continue;
    }
    if (char === ",") {
      currentRow.push(currentField);
      currentField = "";
      i++;
      continue;
    }
    if (char === "\r" && next === "\n") {
      // CRLF — treat as one line ending
      currentRow.push(currentField);
      rows.push(currentRow);
      currentRow = [];
      currentField = "";
      i += 2;
      continue;
    }
    if (char === "\n" || char === "\r") {
      currentRow.push(currentField);
      rows.push(currentRow);
      currentRow = [];
      currentField = "";
      i++;
      continue;
    }
    currentField += char;
    i++;
  }

  // Flush final field/row if no trailing newline
  if (currentField !== "" || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows;
}