import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, Circle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCategories } from "@/queries/use-categories";
import { useItems } from "@/queries/use-items";
import { useLastTransactionDate } from "@/queries/use-last-transaction-date";
import { getStartSteps, isStartIncomplete } from "@/lib/calculations/getting-started";

const dismissedKey = (budgetId: string) => `hisaab:getting-started-dismissed:${budgetId}`;

function wasDismissed(budgetId: string): boolean {
  try {
    return localStorage.getItem(dismissedKey(budgetId)) === "1";
  } catch {
    return false;
  }
}

/** A short checklist for a budget that has nothing in it yet. It disappears
 *  by itself once the three steps are done, or when dismissed. */
export function GettingStarted({ budgetId }: { budgetId: string }) {
  const categories = useCategories(budgetId);
  const items = useItems(budgetId);
  const lastDate = useLastTransactionDate(budgetId);
  const [dismissed, setDismissed] = useState(() => wasDismissed(budgetId));

  const loaded = categories.data && items.data && lastDate.data !== undefined;
  if (dismissed || !loaded) return null;

  const steps = getStartSteps({
    categories: categories.data.length,
    items: items.data.length,
    hasTransaction: lastDate.data !== null,
  });
  if (!isStartIncomplete(steps)) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(dismissedKey(budgetId), "1");
    } catch {
      /* the checklist just reappears next visit */
    }
  };

  const focusEntry = () => {
    const input = document.querySelector<HTMLElement>("[data-entry-search]");
    input?.scrollIntoView({ behavior: "smooth", block: "center" });
    input?.focus({ preventScroll: true });
  };

  return (
    <section aria-label="Getting started" className="rounded-lg glass p-4 sm:p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-medium">Get set up</h2>
          <p className="text-xs text-muted-foreground">Three quick steps and you're tracking.</p>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 shrink-0"
          onClick={dismiss}
          aria-label="Dismiss getting started"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ol className="space-y-2">
        {steps.map((step) => (
          <li key={step.id} className="flex items-center gap-2.5 text-sm">
            {step.done ? (
              <Check className="h-4 w-4 shrink-0 text-accent-text" aria-label="Done" />
            ) : (
              <Circle className="h-4 w-4 shrink-0 text-muted-foreground" aria-label="To do" />
            )}
            <span className={step.done ? "text-muted-foreground line-through" : ""}>
              {step.label}
            </span>
            {!step.done && step.id !== "transaction" && (
              <Link
                to={`/app/budgets/${budgetId}/manage`}
                className="ml-auto text-xs text-accent-text hover:underline underline-offset-2"
              >
                Open Manage
              </Link>
            )}
            {!step.done && step.id === "transaction" && (
              <button
                type="button"
                onClick={focusEntry}
                className="ml-auto text-xs text-accent-text hover:underline underline-offset-2"
              >
                Start
              </button>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
