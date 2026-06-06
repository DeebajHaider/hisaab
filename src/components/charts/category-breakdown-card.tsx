import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CategoryBreakdownChart } from "./category-breakdown-chart";
import type { CategoryBreakdownRow } from "@/lib/calculations/category-breakdown";
import { assignCategoryColors } from "@/lib/calculations/assign-category-colors";

interface CategoryBreakdownCardProps {
  breakdown: CategoryBreakdownRow[];
}

export function CategoryBreakdownCard({ breakdown }: CategoryBreakdownCardProps) {
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
        <CategoryBreakdownChart breakdown={breakdown} colors={colors} />
      </CardContent>
    </Card>
  );
}