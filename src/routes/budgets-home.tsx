import { useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, Pin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBudgets } from "@/queries/use-budgets";
import { useAuth } from "@/lib/auth-context";
import { pinnedFirst, readPinned, togglePinned, writePinned } from "@/lib/pinned-budgets";
import { CreateBudgetDialog } from "@/components/budgets/create-budget-dialog";
import { ResumeLastPage } from "@/components/layout/resume-last-page";
import { BudgetMonthSpend } from "@/components/budgets/budget-month-spend";
import { BudgetLastActivity } from "@/components/budgets/budget-last-activity";

export function BudgetsHome() {
  const { data: budgets, isLoading, error } = useBudgets();

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <ResumeLastPage />
      <div className="flex items-center justify-between flex-wrap gap-y-2 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Your budgets</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pick a budget to log expenses, or create a new one.
          </p>
        </div>
        <CreateBudgetDialog />
      </div>

      {isLoading && <LoadingState />}
      {error && <ErrorState message={(error as Error).message} />}
      {budgets && budgets.length === 0 && <EmptyState />}
      {budgets && budgets.length > 0 && <BudgetGrid budgets={budgets} />}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Three skeleton cards. Plain divs are fine; Tailwind's animate-pulse handles the shimmer. */}
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="rounded-lg border border-border/60 p-6 h-32 bg-muted/30 animate-pulse"
        />
      ))}
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-6 flex items-start gap-3">
      <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
      <div>
        <p className="font-medium">Couldn't load budgets</p>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-border p-12 text-center">
      <p className="text-muted-foreground mb-2">No budgets yet.</p>
      <p className="text-sm text-muted-foreground">
        Click <strong className="text-foreground">New budget</strong> to create your first one.
      </p>
    </div>
  );
}

function BudgetGrid({ budgets }: { budgets: ReturnType<typeof useBudgets>["data"] }) {
  const { user } = useAuth();
  const userId = user?.id;
  const [pinned, setPinned] = useState<string[]>(() => (userId ? readPinned(userId) : []));
  if (!budgets) return null;

  const togglePin = (id: string) => {
    const next = togglePinned(pinned, id);
    setPinned(next);
    if (userId) writePinned(userId, next);
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {pinnedFirst(budgets, pinned).map((budget) => (
        <div key={budget.id} className="relative">
        <button
          type="button"
          onClick={() => togglePin(budget.id)}
          aria-pressed={pinned.includes(budget.id)}
          aria-label={`${pinned.includes(budget.id) ? "Unpin" : "Pin"} ${budget.name}`}
          className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
        >
          <Pin className={`h-4 w-4 ${pinned.includes(budget.id) ? "fill-current text-accent-text" : ""}`} />
        </button>
        <Link to={`/app/budgets/${budget.id}`} className="group block h-full">
          <Card className="h-full transition-colors group-hover:border-accent-border-hover">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center justify-between pr-9">
                <span className="truncate">{budget.name}</span>
                {budget.is_shared && (
                  <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-accent-soft text-accent-soft-foreground">
                    Shared
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <BudgetMonthSpend budgetId={budget.id} currency={budget.currency} />
              <BudgetLastActivity budgetId={budget.id} />
            </CardContent>
          </Card>
        </Link>
        </div>
      ))}
    </div>
  );
}