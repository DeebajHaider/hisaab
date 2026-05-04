import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useCategories } from "@/queries/use-categories";
import { useCreateCategory } from "@/queries/use-category-mutations";

export function Manage() {
  const { budgetId } = useParams<{ budgetId: string }>();
  const { data: categories, isLoading } = useCategories(budgetId);
  const createCategory = useCreateCategory();

  if (!budgetId) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
      <h1 className="text-xl font-semibold tracking-tight">Manage</h1>
      <p className="text-sm text-muted-foreground mt-1 mb-6">
        Categories and items will go here.
      </p>

      <Button
        onClick={() =>
          createCategory.mutate({ budgetId, name: `Test ${Date.now()}` })
        }
        disabled={createCategory.isPending}
      >
        {createCategory.isPending ? "Creating..." : "Add test category"}
      </Button>

      <div className="mt-6">
        {isLoading && <p>Loading...</p>}
        {categories && (
          <ul className="space-y-1">
            {categories.map((c) => (
              <li key={c.id} className="text-sm">
                {c.name} (sort: {c.sort_order})
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}