import { Loader2 } from "lucide-react";
import { useTemplates } from "@/queries/use-templates";
import { useCreateTransaction } from "@/queries/use-transaction-mutations";
import { cn } from "@/lib/utils";

interface QuickAddTemplatesProps {
  budgetId: string;
  date: string;
  currency: string;
}

function formatAmount(amount: number, currency: string): string {
  return `${currency} ${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * One-click quick-add strip for the Day view. Each button is a saved
 * template (see Manage → Templates) — clicking it creates a transaction for
 * the day currently being viewed via the same useCreateTransaction mutation
 * the entry form uses, with no intermediate dialog. Deliberately not
 * recurring/automatic: nothing happens until the user clicks.
 */
export function QuickAddTemplates({ budgetId, date, currency }: QuickAddTemplatesProps) {
  const templatesQuery = useTemplates(budgetId);
  const createMutation = useCreateTransaction();

  const templates = templatesQuery.data ?? [];
  if (templatesQuery.isLoading || templates.length === 0) return null;

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-medium text-muted-foreground px-1">Quick add</h2>
      <div className="flex flex-wrap gap-1.5">
        {templates.map((template) => {
          const displayName = template.label || template.item?.name || "Unknown item";
          const isPending =
            createMutation.isPending &&
            createMutation.variables?.itemId === template.item_id &&
            createMutation.variables?.amount === template.amount;

          return (
            <button
              key={template.id}
              type="button"
              disabled={createMutation.isPending}
              onClick={() =>
                createMutation.mutate({
                  budgetId,
                  categoryId: template.category_id,
                  itemId: template.item_id,
                  date,
                  amount: template.amount,
                  rate: template.rate,
                  qty: template.qty,
                  personId: template.person_id,
                  notes: template.notes,
                })
              }
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors",
                "border-border hover:bg-muted disabled:opacity-60 disabled:pointer-events-none",
              )}
            >
              {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
              <span className="font-medium">{displayName}</span>
              <span className="text-muted-foreground">
                {formatAmount(template.amount, currency)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
