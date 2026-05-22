/**
 * Trigger a browser download of CSV text as a file. Standalone so the
 * download mechanics are testable-by-inspection and reusable.
 */
export function downloadCSV(filename: string, csv: string): void {
  // BOM prefix so Excel opens UTF-8 correctly (named categories may carry
  // non-ASCII). parseCSV strips a leading BOM on re-import, so round-trip
  // is unaffected.
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

