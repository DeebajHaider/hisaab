import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CategoryBreakdownChart } from "./category-breakdown-chart";
import { CategoryBreakdownDonut } from "./category-breakdown-donut";
import type { CategoryBreakdownRow } from "@/lib/calculations/category-breakdown";
import { assignCategoryColors } from "@/lib/calculations/assign-category-colors";

interface CategoryBreakdownCardProps {
  breakdown: CategoryBreakdownRow[];
  total: number;
}

/**
 * Pairs the donut and bar visualisations of category spending for a single
 * month. Stacked on mobile, side-by-side on desktop (lg breakpoint).
 *
 * Color mapping is computed once here and shared between both charts so
 * a category's slice and bar are the same color — and that color matches
 * its line in the Trends page's comparison chart.
 */
export function CategoryBreakdownCard({
  breakdown,
  total,
}: CategoryBreakdownCardProps) {
  const colors = useMemo(
    () => assignCategoryColors(breakdown.map((r) => r.categoryName)),
    [breakdown],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium text-muted-foreground">
          Spending by category
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
          <div className="lg:w-1/3 lg:flex-shrink-0">
            <CategoryBreakdownDonut
              breakdown={breakdown}
              total={total}
              colors={colors}
            />
          </div>
          <div className="lg:w-2/3 lg:flex-grow">
            <CategoryBreakdownChart breakdown={breakdown} colors={colors} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
