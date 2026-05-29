import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useExportTransactions } from "@/queries/use-export-transactions";
import { downloadCSV } from "@/lib/import/download-csv";
import { todayISO } from "@/lib/format/date";

interface ExportTransactionsButtonProps {
  budgetId: string;
  /** Inclusive start date, YYYY-MM-DD. Omit for all-time. */
  from?: string;
  /** Inclusive end date, YYYY-MM-DD. Omit for all-time. */
  to?: string;
  /**
   * What to put in the filename between "hisaab-transactions-" and ".csv".
   * Defaults to today's date; the month view passes the YearMonth.
   */
  filenameSuffix?: string;
  /** Override the button label. Defaults to "Export transactions". */
  label?: string;
}

/**
 * Exports a budget's transactions to a CSV download — all-time or scoped to a
 * date range. The file it produces re-imports through the 5.1 Transactions
 * tab without data loss (the round-trip property is pinned by tests).
 */
export function ExportTransactionsButton({
  budgetId,
  from,
  to,
  filenameSuffix,
  label = "Export transactions",
}: ExportTransactionsButtonProps) {
  const exportTransactions = useExportTransactions();
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setIsExporting(true);
    setError(null);
    try {
      const { csv, rowCount } = await exportTransactions({ budgetId, from, to });
      if (rowCount === 0) {
        setError(
          from || to
            ? "No transactions in this range to export."
            : "This budget has no transactions to export yet.",
        );
        return;
      }
      const suffix = filenameSuffix ?? todayISO();
      downloadCSV(`hisaab-transactions-${suffix}.csv`, csv);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <Button
        variant="outline"
        size="sm"
        onClick={handleExport}
        disabled={isExporting}
      >
        {isExporting ? (
          <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
        ) : (
          <Download className="w-4 h-4 mr-1.5" />
        )}
        {label}
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
