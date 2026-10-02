import { useState } from "react";
import { useParams } from "react-router-dom";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useBudget } from "@/queries/use-budget";
import { useCategories } from "@/queries/use-categories";
import { useItems } from "@/queries/use-items";
import { useTargets } from "@/queries/use-targets";
import { TargetFormDialog } from "@/components/targets/target-form-dialog";
import { TargetCard } from "@/components/targets/target-card";
import { ErrorBanner } from "@/components/ui/error-banner";
import { todayISO } from "@/lib/format/date";

export function Targets() {
  const { budgetId } = useParams<{ budgetId: string }>();
  const [showPast, setShowPast] = useState(false);

  const budgetQuery = useBudget(budgetId);
  const categoriesQuery = useCategories(budgetId);
  const itemsQuery = useItems(budgetId);
  const targetsQuery = useTargets(budgetId);

  if (!budgetId) return null;

  const currency = budgetQuery.data?.currency ?? "PKR";
  const categories = categoriesQuery.data ?? [];
  const items = itemsQuery.data ?? [];
  const targets = targetsQuery.data ?? [];
  const canCreate = categories.length > 0 || items.length > 0;

  const today = todayISO();
  const active = targets
    .filter((t) => t.end_date >= today)
    .sort((a, b) => a.start_date.localeCompare(b.start_date));
  const past = targets
    .filter((t) => t.end_date < today)
    .sort((a, b) => b.end_date.localeCompare(a.end_date));

  const isLoading =
    budgetQuery.isLoading || categoriesQuery.isLoading || itemsQuery.isLoading || targetsQuery.isLoading;
  const queryError =
    budgetQuery.error ?? categoriesQuery.error ?? itemsQuery.error ?? targetsQuery.error;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-y-2">
        <div>
          <h1 className="text-2xl font-semibold">Targets</h1>
          <p className="text-sm text-muted-foreground">
            Spending goals for any mix of categories and items, over any date range.
          </p>
        </div>
        {canCreate && targets.length > 0 && (
          <TargetFormDialog
            budgetId={budgetId}
            categories={categories}
            items={items}
            trigger={
              <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white">
                <Plus className="w-4 h-4 mr-1.5" />
                New target
              </Button>
            }
          />
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : queryError ? (
        <ErrorBanner context="targets" error={queryError} />
      ) : targets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground space-y-4">
            <p>
              {canCreate
                ? "No targets yet. Set a spending goal for a category, an item, or a mix of both."
                : "Set up a category or item first, then come back to add targets."}
            </p>
            {canCreate && (
              <TargetFormDialog
                budgetId={budgetId}
                categories={categories}
                items={items}
                trigger={
                  <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white">
                    <Plus className="w-4 h-4 mr-1.5" />
                    New target
                  </Button>
                }
              />
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="space-y-3">
            {active.length === 0 ? (
              <p className="text-sm text-muted-foreground px-1">No active targets right now.</p>
            ) : (
              active.map((target) => (
                <TargetCard
                  key={target.id}
                  budgetId={budgetId}
                  currency={currency}
                  target={target}
                  categories={categories}
                  items={items}
                />
              ))
            )}
          </div>

          {past.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setShowPast((v) => !v)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPast ? "Hide" : "Show"} past targets ({past.length})
              </button>

              {showPast && (
                <div className="space-y-3 mt-3">
                  {past.map((target) => (
                    <TargetCard
                      key={target.id}
                      budgetId={budgetId}
                      currency={currency}
                      target={target}
                      categories={categories}
                      items={items}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
