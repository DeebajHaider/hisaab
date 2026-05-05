import { useParams } from "react-router-dom";
import { Plus, FolderPlus, Upload } from "lucide-react";
import { ImportDialog } from "@/components/manage/import-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCategories } from "@/queries/use-categories";
import { useItems } from "@/queries/use-items";
import { groupItemsByCategory } from "@/lib/format/tree-sort";
import { CategoryTree } from "@/components/manage/category-tree";
import { CategoryFormDialog } from "@/components/manage/category-form-dialog";

export function Manage() {
  const { budgetId } = useParams<{ budgetId: string }>();
  const categoriesQuery = useCategories(budgetId);
  const itemsQuery = useItems(budgetId);

  if (!budgetId) return null;

  const isLoading = categoriesQuery.isLoading || itemsQuery.isLoading;
  const error = categoriesQuery.error || itemsQuery.error;
  const categories = categoriesQuery.data ?? [];
  const items = itemsQuery.data ?? [];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
      <Header budgetId={budgetId} />

      {isLoading && <ManageSkeleton />}
      {error && <ErrorState message={(error as Error).message} />}
      {!isLoading && !error && categories.length === 0 && (
        <EmptyState budgetId={budgetId} />
      )}
      {!isLoading && !error && categories.length > 0 && (
        <CategoryTree
          budgetId={budgetId}
          categories={categories}
          groups={groupItemsByCategory(categories, items)}
        />
      )}
    </div>
  );
}

function Header({ budgetId }: { budgetId: string }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Categories & items</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Set up the structure of this budget. Add categories like Groceries or Vehicle, then items underneath.
        </p>
      </div>
      <div className="flex gap-2">
        <ImportDialog
          budgetId={budgetId}
          trigger={
            <Button variant="outline" size="sm">
              <Upload className="w-4 h-4 mr-1.5" />
              Import
            </Button>
          }
        />
        <CategoryFormDialog
          budgetId={budgetId}
          trigger={
            <Button
              size="sm"
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              New category
            </Button>
          }
        />
      </div>
    </div>
  );
}

function ManageSkeleton() {
  return (
    <div className="space-y-2">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="rounded-lg border border-border/60 p-4 flex items-center gap-3"
        >
          <Skeleton className="w-4 h-4" />
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-16 ml-auto" />
        </div>
      ))}
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-6">
      <p className="font-medium">Couldn't load categories</p>
      <p className="text-sm text-muted-foreground mt-1">{message}</p>
    </div>
  );
}

function EmptyState({ budgetId }: { budgetId: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border p-12 text-center">
      <FolderPlus className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
      <h3 className="font-medium mb-1">No categories yet</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
        Add your first category, or import a starter template.
      </p>
      <div className="flex justify-center gap-2">
        <ImportDialog
          budgetId={budgetId}
          trigger={
            <Button variant="outline" size="sm">
              <Upload className="w-4 h-4 mr-1.5" />
              Import
            </Button>
          }
        />
        <CategoryFormDialog
          budgetId={budgetId}
          trigger={
            <Button
              size="sm"
              className="bg-teal-600 hover:bg-teal-700 text-white"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Add category
            </Button>
          }
        />
      </div>
    </div>
  );
}