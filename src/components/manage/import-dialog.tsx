import { useState, useRef, type ChangeEvent } from "react";
import {
  Download,
  Upload,
  AlertCircle,
  CheckCircle2,
  Loader2,
  FileSpreadsheet,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { parseCSV } from "@/lib/import/csv-parser";
import {
  buildImportPlan,
  TEMPLATE_CSV_SAMPLE,
  type ImportError,
  type ImportPlan,
} from "@/lib/import/template-import";
import {
  buildTransactionImportPlan,
  type TransactionImportPlan,
} from "@/lib/import/transaction-import";
import { useImportTemplate } from "@/queries/use-import-template";
import { useImportTransactions } from "@/queries/use-import-transactions";
import { useCategories } from "@/queries/use-categories";
import { useItems } from "@/queries/use-items";
import type { ReactNode } from "react";

interface ImportDialogProps {
  budgetId: string;
  trigger: ReactNode;
}

export function ImportDialog({ budgetId, trigger }: ImportDialogProps) {
  const [open, setOpen] = useState(false);
  const importMutation = useImportTemplate();

  // Reset taxonomy-import state on close so reopening is clean. The
  // transaction tab manages its own reset internally (see TransactionTab).
  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      importMutation.reset();
    }
  };

  const handleImportSuccess = (result: {
    categoriesInserted: number;
    itemsInserted: number;
    categoriesRestored: number;
    itemsRestored: number;
  }) => {
    const changedSomething =
      result.categoriesInserted > 0 ||
      result.itemsInserted > 0 ||
      result.categoriesRestored > 0 ||
      result.itemsRestored > 0;
    if (changedSomething) {
      setTimeout(() => setOpen(false), 1500);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import data</DialogTitle>
          <DialogDescription>
            Set up your taxonomy from the standard template or a CSV, or
            import real transactions from an exported budget CSV.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="template" className="mt-2">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="template">Use template</TabsTrigger>
            <TabsTrigger value="csv">Upload CSV</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
          </TabsList>

          <TabsContent value="template" className="mt-4">
            <TemplateTab budgetId={budgetId} onImported={handleImportSuccess} />
          </TabsContent>

          <TabsContent value="csv" className="mt-4">
            <CSVTab budgetId={budgetId} onImported={handleImportSuccess} />
          </TabsContent>

          <TabsContent value="transactions" className="mt-4">
            <TransactionTab budgetId={budgetId} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// ----------------------------------------------------------------------------
// Tab 1: built-in template
// ----------------------------------------------------------------------------
function TemplateTab({
  budgetId,
  onImported,
}: {
  budgetId: string;
  onImported: (result: {
    categoriesInserted: number;
    itemsInserted: number;
    categoriesRestored: number;
    itemsRestored: number;
  }) => void;
}) {
  const importMutation = useImportTemplate();

  // Parse the built-in template once. It's a constant, so this is a cheap operation.
  const parsed = parseCSV(TEMPLATE_CSV_SAMPLE);
  const { plan } = buildImportPlan(parsed);

  const handleImport = async () => {
    if (!plan) return;
    try {
      const result = await importMutation.mutateAsync({ budgetId, plan });
      onImported(result);
    } catch {
      // Error state handled by mutation.error below
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border/60 bg-muted/30 p-4 text-sm">
        <div className="font-medium mb-1">Standard family budget template</div>
        <div className="text-muted-foreground text-xs">
          {plan?.categories.length} categories, {plan?.items.length} items.
          Includes Groceries, Vehicle, Utilities, Health, Education, and more.
          Per-person tracking on Health, Education, and Personal.
        </div>
      </div>

      {/* Preview list */}
      {plan && (
        <div className="rounded-md border border-border/60 max-h-48 overflow-y-auto">
          <ul className="divide-y divide-border/40">
            {plan.categories.map((cat) => {
              const itemCount = plan.items.filter(
                (i) => i.category_name === cat.name,
              ).length;
              return (
                <li
                  key={cat.name}
                  className="px-3 py-1.5 text-sm flex items-center justify-between"
                >
                  <span>
                    {cat.name}
                    {cat.tracks_person && (
                      <span className="text-xs text-muted-foreground ml-2">
                        · per-person
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {itemCount} {itemCount === 1 ? "item" : "items"}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <ImportStatusMessage mutation={importMutation} />

      <DialogFooter>
        <Button
          onClick={handleImport}
          disabled={importMutation.isPending || !plan}
          className="bg-accent-solid hover:bg-accent-solid-hover text-white"
        >
          {importMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Importing...
            </>
          ) : (
            "Import template"
          )}
        </Button>
      </DialogFooter>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Tab 2: CSV upload
// ----------------------------------------------------------------------------
function CSVTab({
  budgetId,
  onImported,
}: {
  budgetId: string;
  onImported: (result: {
    categoriesInserted: number;
    itemsInserted: number;
    categoriesRestored: number;
    itemsRestored: number;
  }) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvText, setCsvText] = useState("");
  const [errors, setErrors] = useState<ImportError[]>([]);
  const [plan, setPlan] = useState<ImportPlan | null>(null);
  const importMutation = useImportTemplate();

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setCsvText(text);
    validate(text);
    if (importMutation.isSuccess || importMutation.isError) {
      importMutation.reset();
    }
    // Clear the input's value so picking the same file again still triggers onChange.
    // Without this, picking the same file twice silently does nothing.
    e.target.value = "";
  };

  const validate = (text: string) => {
    setErrors([]);
    setPlan(null);

    if (!text.trim()) return;

    try {
      const parsed = parseCSV(text);
      const result = buildImportPlan(parsed);
      setErrors(result.errors);
      setPlan(result.plan);
    } catch (err) {
      setErrors([
        { row: 0, message: err instanceof Error ? err.message : "Failed to parse" },
      ]);
    }
  };

  const handleTextChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setCsvText(e.target.value);
    validate(e.target.value);
    if (importMutation.isSuccess || importMutation.isError) {
      importMutation.reset();
    }
  };

  const handleDownloadSample = () => {
    const blob = new Blob([TEMPLATE_CSV_SAMPLE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "hisaab-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    if (!plan) return;
    try {
      const result = await importMutation.mutateAsync({ budgetId, plan });
      onImported(result);
    } catch {
      // shown via mutation.error
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground space-y-2">
        <div>
          Each row is one item. Categories are inferred from the{" "}
          <code className="text-xs bg-muted px-1 py-0.5 rounded">category</code>{" "}
          column — rows sharing the same category name are grouped under one
          category.
        </div>
        <div>
          <span className="font-medium text-foreground">Required columns:</span>{" "}
          <code className="text-xs bg-muted px-1 py-0.5 rounded">category</code>,{" "}
          <code className="text-xs bg-muted px-1 py-0.5 rounded">item</code>.{" "}
          <span className="font-medium text-foreground">Optional:</span>{" "}
          <code className="text-xs bg-muted px-1 py-0.5 rounded">unit</code>,{" "}
          <code className="text-xs bg-muted px-1 py-0.5 rounded">default_rate</code>,{" "}
          <code className="text-xs bg-muted px-1 py-0.5 rounded">default_mode</code>{" "}
          (<code className="text-xs">lump</code> or{" "}
          <code className="text-xs">rate_qty</code>, defaults to{" "}
          <code className="text-xs">lump</code>),{" "}
          <code className="text-xs bg-muted px-1 py-0.5 rounded">tracks_person</code>{" "}
          (accepts <code className="text-xs">true/false</code>,{" "}
          <code className="text-xs">yes/no</code>,{" "}
          <code className="text-xs">1/0</code>; case-insensitive; defaults to
          false).
        </div>
        <div>
          Re-importing the same CSV is safe — existing categories and items are
          skipped.
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="w-4 h-4 mr-1.5" />
          Choose CSV file
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={handleFileChange}
        />
        <Button variant="outline" size="sm" onClick={handleDownloadSample}>
          <Download className="w-4 h-4 mr-1.5" />
          Download sample CSV
        </Button>
      </div>

      <div className="space-y-2">
        <label htmlFor="import-csv-text" className="text-xs text-muted-foreground">
          Or paste CSV content directly:
        </label>
        <Textarea
          id="import-csv-text"
          value={csvText}
          onChange={handleTextChange}
          placeholder={
            TEMPLATE_CSV_SAMPLE.split("\n").slice(0, 4).join("\n") + "\n..."
          }
          className="font-mono text-base md:text-xs h-32"
        />
      </div>

      {/* Validation errors */}
      {errors.length > 0 && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 space-y-1">
          <div className="flex items-center gap-2 text-sm font-medium text-destructive">
            <AlertCircle className="w-4 h-4" />
            {errors.length} {errors.length === 1 ? "error" : "errors"} in CSV
          </div>
          <ul className="text-xs text-muted-foreground space-y-0.5 max-h-32 overflow-y-auto">
            {errors.slice(0, 10).map((err, i) => (
              <li key={i}>
                {err.row > 0 && (
                  <span className="font-mono">Row {err.row}: </span>
                )}
                {err.message}
              </li>
            ))}
            {errors.length > 10 && (
              <li className="italic">...and {errors.length - 10} more</li>
            )}
          </ul>
        </div>
      )}

      {/* Valid plan preview */}
      {plan && errors.length === 0 && (
        <div className="rounded-md border border-border/60 bg-muted/30 p-3 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-accent-text" />
            <span>
              Ready to import: <strong>{plan.categories.length}</strong>{" "}
              categories, <strong>{plan.items.length}</strong> items
            </span>
          </div>
        </div>
      )}

      <ImportStatusMessage mutation={importMutation} />

      <DialogFooter>
        <Button
          onClick={handleImport}
          disabled={!plan || errors.length > 0 || importMutation.isPending}
          className="bg-accent-solid hover:bg-accent-solid-hover text-white"
        >
          {importMutation.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Importing...
            </>
          ) : (
            "Import"
          )}
        </Button>
      </DialogFooter>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Tab 3: real transaction import
//
// Consumes the narrow transactions CSV emitted by scripts/convert-budget-csv.mjs
// (date,category,item,amount,rate,qty,notes). Unlike the taxonomy tabs, this
// tab needs the budget's existing categories and items to resolve names and
// detect what must be auto-created — so it fetches them and passes them as
// context to buildTransactionImportPlan.
//
// Flow is a small state machine:
//   idle -> (file chosen) -> preview (errors OR ready) -> importing -> done
// On success it deliberately does NOT auto-close or auto-reset: the user must
// explicitly start another import. This is the guard against an accidental
// double-import, since transaction import is one-shot (no dedup).
// ----------------------------------------------------------------------------

const TRANSACTION_CSV_HEADER = "date,category,item,amount,rate,qty,notes";

// A tiny sample, mirroring how the taxonomy tabs offer a downloadable example.
const TRANSACTION_CSV_SAMPLE =
  TRANSACTION_CSV_HEADER +
  "\n" +
  "2026-02-01,Groceries,Milk,180,,,\n" +
  "2026-02-01,Vehicle,Fuel,5000,250,20,\n" +
  "2026-02-03,Dining,Restaurant,2400,,,Dinner out\n";

function TransactionTab({ budgetId }: { budgetId: string }) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // The budget's current taxonomy — needed to resolve names and decide what
  // to auto-create. While these load, the import button stays disabled.
  const categoriesQuery = useCategories(budgetId);
  const itemsQuery = useItems(budgetId);

  const importMutation = useImportTransactions();

  // Preview state. `errors` and `plan` are mutually exclusive: a clean file
  // yields a plan and no errors; any error yields errors and a null plan.
  const [fileName, setFileName] = useState<string | null>(null);
  const [errors, setErrors] = useState<ImportError[]>([]);
  const [plan, setPlan] = useState<TransactionImportPlan | null>(null);

  const taxonomyLoading = categoriesQuery.isLoading || itemsQuery.isLoading;
  const taxonomyError = categoriesQuery.error ?? itemsQuery.error;

  /** Parse + validate a CSV string, updating preview state. */
  const validate = (text: string) => {
    setErrors([]);
    setPlan(null);

    // Build the resolution context from the loaded taxonomy. useItems joins
    // each item to its category, so category_id is available on the row.
    const context = {
      categories: (categoriesQuery.data ?? []).map((c) => ({
        id: c.id,
        name: c.name,
      })),
      items: (itemsQuery.data ?? []).map((i) => ({
        id: i.id,
        name: i.name,
        categoryId: i.category_id,
      })),
    };

    try {
      const parsed = parseCSV(text);
      const result = buildTransactionImportPlan(parsed, context);
      setErrors(result.errors);
      setPlan(result.plan);
    } catch (err) {
      // parseCSV throws on ragged rows / empty input. Surface it as a
      // row-0 error, same convention as the taxonomy CSV tab.
      setErrors([
        {
          row: 0,
          message: err instanceof Error ? err.message : "Failed to parse CSV",
        },
      ]);
    }
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    setFileName(file.name);
    validate(text);
    if (importMutation.isSuccess || importMutation.isError) {
      importMutation.reset();
    }
    // Clear the value so re-picking the same file still fires onChange.
    e.target.value = "";
  };

  const handleDownloadSample = () => {
    const blob = new Blob([TRANSACTION_CSV_SAMPLE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "hisaab-transactions-sample.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    if (!plan) return;
    try {
      await importMutation.mutateAsync({ budgetId, plan });
    } catch {
      // surfaced via importMutation.error below
    }
  };

  /** Clear everything to import another file. */
  const handleReset = () => {
    setFileName(null);
    setErrors([]);
    setPlan(null);
    importMutation.reset();
  };

  // Float-safe total for the preview summary — paisa-based integer sum.
  const previewTotal = plan
    ? plan.transactions.reduce(
        (sum, t) => sum + Math.round(t.amount * 100),
        0,
      ) / 100
    : 0;

  const done = importMutation.isSuccess && importMutation.data;

  return (
    <div className="space-y-4">
      {/* Explanation */}
      <div className="text-sm text-muted-foreground space-y-2">
        <div>
          Import real transactions from a CSV. Each row is one transaction.
          Use{" "}
          <code className="text-xs bg-muted px-1 py-0.5 rounded">
            convert-budget-csv
          </code>{" "}
          to turn a legacy budget sheet into this format.
        </div>
        <div>
          <span className="font-medium text-foreground">Required columns:</span>{" "}
          <code className="text-xs bg-muted px-1 py-0.5 rounded">date</code>{" "}
          (YYYY-MM-DD),{" "}
          <code className="text-xs bg-muted px-1 py-0.5 rounded">category</code>,{" "}
          <code className="text-xs bg-muted px-1 py-0.5 rounded">item</code>,{" "}
          <code className="text-xs bg-muted px-1 py-0.5 rounded">amount</code>.{" "}
          <span className="font-medium text-foreground">Optional:</span>{" "}
          <code className="text-xs bg-muted px-1 py-0.5 rounded">rate</code>,{" "}
          <code className="text-xs bg-muted px-1 py-0.5 rounded">qty</code>{" "}
          (both or neither),{" "}
          <code className="text-xs bg-muted px-1 py-0.5 rounded">notes</code>.
        </div>
        <div>
          Categories and items that don't exist yet are created automatically.
          This is a{" "}
          <span className="font-medium text-foreground">one-shot</span> import —
          re-running the same file imports the rows again, so import each file
          once.
        </div>
      </div>

      {/* Taxonomy-load failure — can't build a plan without it */}
      {taxonomyError && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
          <div>
            <div className="font-medium text-destructive">
              Couldn't load this budget's categories
            </div>
            <div className="text-xs text-muted-foreground">
              Importing needs the current taxonomy to resolve names. Close and
              reopen the dialog to retry.
            </div>
          </div>
        </div>
      )}

      {/* File picker — hidden once an import has succeeded */}
      {!done && (
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={taxonomyLoading || !!taxonomyError}
            onClick={() => fileInputRef.current?.click()}
          >
            {taxonomyLoading ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 mr-1.5" />
            )}
            Choose transactions CSV
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button variant="outline" size="sm" onClick={handleDownloadSample}>
            <Download className="w-4 h-4 mr-1.5" />
            Download sample CSV
          </Button>
        </div>
      )}

      {/* Chosen file name */}
      {fileName && !done && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span className="font-mono">{fileName}</span>
        </div>
      )}

      {/* Validation errors — all-or-nothing surfaced */}
      {errors.length > 0 && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 space-y-1">
          <div className="flex items-center gap-2 text-sm font-medium text-destructive">
            <AlertCircle className="w-4 h-4" />
            {errors.length} {errors.length === 1 ? "problem" : "problems"} found
            — nothing will be imported
          </div>
          <ul className="text-xs text-muted-foreground space-y-0.5 max-h-40 overflow-y-auto">
            {errors.slice(0, 12).map((err, i) => (
              <li key={i}>
                {err.row > 0 && (
                  <span className="font-mono">Row {err.row}: </span>
                )}
                {err.message}
              </li>
            ))}
            {errors.length > 12 && (
              <li className="italic">...and {errors.length - 12} more</li>
            )}
          </ul>
          <div className="text-xs text-muted-foreground pt-1">
            Fix these in the CSV and choose the file again.
          </div>
        </div>
      )}

      {/* Clean plan — the dry-run preview */}
      {plan && errors.length === 0 && !done && (
        <div className="rounded-md border border-border/60 bg-muted/30 p-3 text-sm space-y-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-accent-text" />
            <span>
              Ready to import <strong>{plan.transactions.length}</strong>{" "}
              {plan.transactions.length === 1 ? "transaction" : "transactions"},
              totalling{" "}
              <strong>Rs {previewTotal.toLocaleString()}</strong>.
            </span>
          </div>

          {(plan.categoriesToCreate.length > 0 ||
            plan.itemsToCreate.length > 0) && (
            <div className="text-xs text-muted-foreground space-y-1 pt-1 border-t border-border/40">
              <div className="pt-1">
                This import will also create{" "}
                <strong className="text-foreground">
                  {plan.categoriesToCreate.length}
                </strong>{" "}
                new{" "}
                {plan.categoriesToCreate.length === 1
                  ? "category"
                  : "categories"}{" "}
                and{" "}
                <strong className="text-foreground">
                  {plan.itemsToCreate.length}
                </strong>{" "}
                new {plan.itemsToCreate.length === 1 ? "item" : "items"}.
              </div>
              {plan.categoriesToCreate.length > 0 && (
                <div>
                  <span className="font-medium">New categories:</span>{" "}
                  {plan.categoriesToCreate.map((c) => c.name).join(", ")}
                </div>
              )}
              <div className="italic pt-0.5">
                Check these for typos before importing — a misspelled name
                creates a duplicate category or item.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Import failure */}
      {importMutation.error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
          <div>
            <div className="font-medium text-destructive">Import failed</div>
            <div className="text-xs text-muted-foreground">
              {importMutation.error instanceof Error
                ? importMutation.error.message
                : "Unknown error"}
              . Some rows may have been written — check the day view before
              retrying.
            </div>
          </div>
        </div>
      )}

      {/* Success — held until the user explicitly starts another import */}
      {done && (
        <div className="rounded-md border border-accent-highlight-border bg-accent-highlight p-3 text-sm flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-accent-text mt-0.5 shrink-0" />
          <div className="space-y-1">
            <div>
              Imported{" "}
              <strong>{importMutation.data.transactionsInserted}</strong>{" "}
              {importMutation.data.transactionsInserted === 1
                ? "transaction"
                : "transactions"}
              .
            </div>
            {(importMutation.data.categoriesInserted > 0 ||
              importMutation.data.itemsInserted > 0) && (
              <div className="text-xs text-muted-foreground">
                Created {importMutation.data.categoriesInserted}{" "}
                {importMutation.data.categoriesInserted === 1
                  ? "category"
                  : "categories"}{" "}
                and {importMutation.data.itemsInserted}{" "}
                {importMutation.data.itemsInserted === 1 ? "item" : "items"}.
              </div>
            )}
          </div>
        </div>
      )}

      <DialogFooter>
        {done ? (
          <Button variant="outline" onClick={handleReset}>
            Import another file
          </Button>
        ) : (
          <Button
            onClick={handleImport}
            disabled={
              !plan ||
              errors.length > 0 ||
              importMutation.isPending ||
              taxonomyLoading
            }
            className="bg-accent-solid hover:bg-accent-solid-hover text-white"
          >
            {importMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              "Import transactions"
            )}
          </Button>
        )}
      </DialogFooter>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Shared status message component for the template + CSV tabs
// ----------------------------------------------------------------------------
function ImportStatusMessage({
  mutation,
}: {
  mutation: ReturnType<typeof useImportTemplate>;
}) {
  if (mutation.isSuccess && mutation.data) {
    const {
      categoriesInserted,
      itemsInserted,
      categoriesSkipped,
      itemsSkipped,
      categoriesRestored,
      itemsRestored,
    } = mutation.data;

    const addedSomething = categoriesInserted > 0 || itemsInserted > 0;
    const restoredSomething = categoriesRestored > 0 || itemsRestored > 0;

    return (
      <div className="rounded-md border border-accent-highlight-border bg-accent-highlight p-3 text-sm flex items-start gap-2">
        <CheckCircle2 className="w-4 h-4 text-accent-text mt-0.5 shrink-0" />
        <div className="space-y-1">
          {addedSomething && (
            <div>
              Added <strong>{categoriesInserted}</strong>{" "}
              {categoriesInserted === 1 ? "category" : "categories"} and{" "}
              <strong>{itemsInserted}</strong>{" "}
              {itemsInserted === 1 ? "item" : "items"}.
            </div>
          )}
          {restoredSomething && (
            <div>
              Restored <strong>{categoriesRestored}</strong> archived{" "}
              {categoriesRestored === 1 ? "category" : "categories"} and{" "}
              <strong>{itemsRestored}</strong> archived{" "}
              {itemsRestored === 1 ? "item" : "items"}.
            </div>
          )}
          {!addedSomething && !restoredSomething && (
            <div>Everything in the import was already in this budget.</div>
          )}
          {(categoriesSkipped > 0 || itemsSkipped > 0) && (
            <div className="text-xs text-muted-foreground">
              {categoriesSkipped}{" "}
              {categoriesSkipped === 1 ? "category" : "categories"} and{" "}
              {itemsSkipped} {itemsSkipped === 1 ? "item" : "items"} already
              existed and were skipped.
            </div>
          )}
        </div>
      </div>
    );
  }
  if (mutation.error) {
    return (
      <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-destructive mt-0.5" />
        <div>
          <div className="font-medium text-destructive">Import failed</div>
          <div className="text-xs text-muted-foreground">
            {mutation.error instanceof Error
              ? mutation.error.message
              : "Unknown error"}
          </div>
        </div>
      </div>
    );
  }
  return null;
}

