import { Loader2 } from "lucide-react";
import { useIncomeTemplates } from "@/queries/use-income-templates";
import { useCreateIncome } from "@/queries/use-income-mutations";
import { incomeQuickAddDate } from "@/lib/calculations/income-quick-add-date";
import { todayISO } from "@/lib/format/date";
import type { YearMonth } from "@/lib/format/year-month";

/** One-click buttons for saved income templates. Renders nothing without any. */
export function IncomeQuickAdd({
  budgetId,
  yearMonth,
  currency,
}: {
  budgetId: string;
  yearMonth: YearMonth;
  currency: string;
}) {
  const templatesQuery = useIncomeTemplates(budgetId);
  const createMutation = useCreateIncome();

  const templates = templatesQuery.data ?? [];
  if (templatesQuery.isLoading || templates.length === 0) return null;

  return (
    <div className="mb-3 flex flex-wrap gap-1.5">
      {templates.map((template) => {
        const isPending =
          createMutation.isPending && createMutation.variables?.source === template.source;
        return (
          <button
            key={template.id}
            type="button"
            disabled={createMutation.isPending}
            onClick={() =>
              createMutation.mutate({
                budgetId,
                source: template.source,
                amount: Number(template.amount),
                date: incomeQuickAddDate(yearMonth, todayISO()),
                notes: template.notes,
              })
            }
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-60"
          >
            {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
            <span className="font-medium">{template.source}</span>
            <span className="text-muted-foreground tabular-nums">
              {currency}{" "}
              {Number(template.amount).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </button>
        );
      })}
    </div>
  );
}
