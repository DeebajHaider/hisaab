import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CategoryBreakdownChart } from "./category-breakdown-chart";
import type { CategoryBreakdownRow } from "@/lib/calculations/category-breakdown";
import { assignCategoryColors } from "@/lib/calculations/assign-category-colors";

interface CategoryBreakdownCardProps {
  breakdown: CategoryBreakdownRow[];
}

export function CategoryBreakdownCard({ breakdown }: CategoryBreakdownCardProps) {
  // Names of categories currently hidden by the user.
  // Session-ephemeral and persists across month navigation — useful for
  // comparing the same subcategories month-to-month without re-filtering.
  const [excluded, setExcluded] = useState<Set<string>>(new Set());

  const colors = useMemo(
    () => assignCategoryColors(breakdown.map((r) => r.categoryName)),
    [breakdown],
  );

  const toggle = (name: string) => {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const showAll = () => setExcluded(new Set());

  // Count only names that exist in the current month's breakdown — the
  // excluded set may contain names from a previous month that aren't
  // present here and shouldn't surface in the indicator.
  const excludedCount = breakdown.filter((r) => excluded.has(r.categoryName)).length;

  // Recalculate percentages relative to the visible total so bar lengths
  // and percent labels reflect proportions within the filtered view, not
  // fractions of the total including hidden categories.
  const visible = breakdown.filter((r) => !excluded.has(r.categoryName));
  const visibleTotal = visible.reduce((sum, r) => sum + r.total, 0);
  const visibleBreakdown: CategoryBreakdownRow[] = visible.map((r) => ({
    ...r,
    percent: visibleTotal > 0 ? (r.total / visibleTotal) * 100 : 0,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium text-muted-foreground">
          Spending by category
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Chips — only useful when there's more than one category to compare */}
        {breakdown.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            {breakdown.map((row) => {
              const isExcluded = excluded.has(row.categoryName);
              return (
                <button
                  key={row.categoryName}
                  onClick={() => toggle(row.categoryName)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-border transition-opacity ${
                    isExcluded
                      ? "opacity-40 bg-transparent"
                      : "opacity-100 bg-muted/50"
                  }`}
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{
                      backgroundColor:
                        colors[row.categoryName] ?? "var(--muted-foreground)",
                    }}
                  />
                  {row.categoryName}
                </button>
              );
            })}
          </div>
        )}

        {/* Exclusion indicator */}
        {excludedCount > 0 && (
          <p className="text-xs text-muted-foreground">
            Excluding {excludedCount}{" "}
            {excludedCount === 1 ? "category" : "categories"}
            {" · "}
            <button
              onClick={showAll}
              className="underline underline-offset-2 hover:text-foreground transition-colors"
            >
              Show all
            </button>
          </p>
        )}

        {/* Chart or empty state */}
        {visibleBreakdown.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No categories selected.{" "}
            <button
              onClick={showAll}
              className="underline underline-offset-2 hover:text-foreground transition-colors"
            >
              Show all
            </button>
          </p>
        ) : (
          <CategoryBreakdownChart breakdown={visibleBreakdown} colors={colors} />
        )}
      </CardContent>
    </Card>
  );
}