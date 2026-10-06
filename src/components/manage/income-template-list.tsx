import { useState } from "react";
import { Plus, Pencil, Archive, ArchiveRestore } from "lucide-react";
import { useIncomeTemplates, type IncomeTemplate } from "@/queries/use-income-templates";
import { useArchiveIncomeTemplate } from "@/queries/use-income-template-mutations";
import { IncomeTemplateFormDialog } from "./income-template-form-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

function formatAmount(amount: number, currency: string): string {
  return `${currency} ${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Income template management for the Manage page: saved entries (a salary, a
 *  fixed return) that show up as one-click buttons on the Month view. */
export function IncomeTemplateList({
  budgetId,
  currency,
}: {
  budgetId: string;
  currency: string;
}) {
  const query = useIncomeTemplates(budgetId, { includeArchived: true });
  const [showArchived, setShowArchived] = useState(false);

  const all = query.data ?? [];
  const active = all.filter((t) => !t.is_archived);
  const archived = all.filter((t) => t.is_archived);

  const addButton = (label: string) => (
    <IncomeTemplateFormDialog
      budgetId={budgetId}
      trigger={
        <Button size="sm" className="bg-accent-solid hover:bg-accent-solid-hover text-white">
          <Plus className="w-4 h-4 mr-1.5" />
          {label}
        </Button>
      }
    />
  );

  return (
    <section className="mt-10">
      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Income templates</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">
            Saved income you can add with one click from the Month view — a salary, a
            fixed return, anything that arrives the same way each time.
          </p>
        </div>
        {active.length > 0 && addButton("New income template")}
      </div>

      {query.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-11 w-full" />
        </div>
      ) : all.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
            No income templates yet. Add one for income you log the same way every time.
          </p>
          {addButton("Add income template")}
        </div>
      ) : (
        <div className="space-y-2">
          {active.map((t) => (
            <Row key={t.id} template={t} budgetId={budgetId} currency={currency} />
          ))}

          {archived.length > 0 && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowArchived((v) => !v)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {showArchived ? "Hide" : "Show"} archived ({archived.length})
              </button>
              {showArchived && (
                <div className="space-y-2 mt-2">
                  {archived.map((t) => (
                    <Row key={t.id} template={t} budgetId={budgetId} currency={currency} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function Row({
  template,
  budgetId,
  currency,
}: {
  template: IncomeTemplate;
  budgetId: string;
  currency: string;
}) {
  const archive = useArchiveIncomeTemplate();

  return (
    <div
      className={`flex items-center gap-3 rounded-md border border-border/60 px-3 py-2.5 ${
        template.is_archived ? "opacity-60" : ""
      }`}
    >
      <div className="min-w-0 flex-1 flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium truncate">{template.source}</span>
        <span className="text-xs text-muted-foreground">
          {formatAmount(Number(template.amount), currency)}
        </span>
        {template.is_archived && <span className="text-xs text-muted-foreground">(archived)</span>}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {!template.is_archived && (
          <IncomeTemplateFormDialog
            budgetId={budgetId}
            existing={template}
            trigger={
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                aria-label={`Edit ${template.source}`}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            }
          />
        )}
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          disabled={archive.isPending}
          onClick={() =>
            archive.mutate({ id: template.id, budgetId, archived: !template.is_archived })
          }
          aria-label={
            template.is_archived ? `Unarchive ${template.source}` : `Archive ${template.source}`
          }
          title={template.is_archived ? "Unarchive" : "Archive"}
        >
          {template.is_archived ? (
            <ArchiveRestore className="h-4 w-4" />
          ) : (
            <Archive className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
