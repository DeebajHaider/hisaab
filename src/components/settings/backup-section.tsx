import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { exportBackup } from "@/lib/backup/export-backup";
import { backupFileName, summarizeBackup } from "@/lib/backup/build-backup";

function downloadJSON(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** One-click download of everything the person can see, as a JSON file. */
export function BackupSection() {
  const [pending, setPending] = useState(false);

  const run = async () => {
    setPending(true);
    try {
      const backup = await exportBackup();
      downloadJSON(backupFileName(), backup);
      const { budgets, transactions, portfolios } = summarizeBackup(backup);
      toast.success("Backup downloaded.", {
        description: `${budgets} budget${budgets === 1 ? "" : "s"}, ${transactions.toLocaleString()} transactions, ${portfolios} portfolio${portfolios === 1 ? "" : "s"}.`,
      });
    } catch (err) {
      toast.error("Couldn't create the backup.", {
        description: err instanceof Error ? err.message : "Unknown error.",
        duration: 6000,
      });
    } finally {
      setPending(false);
    }
  };

  return (
    <section className="rounded-lg glass p-5 sm:p-6">
      <header className="mb-4">
        <h2 className="text-base font-medium">Your data</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Download a copy of everything you can see: budgets, categories, items, people,
          transactions, income, savings, templates, targets and portfolios. It includes shared
          budgets you belong to.
        </p>
      </header>
      <Button variant="outline" onClick={run} disabled={pending}>
        {pending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Preparing...
          </>
        ) : (
          <>
            <Download className="mr-2 h-4 w-4" />
            Download backup
          </>
        )}
      </Button>
    </section>
  );
}
