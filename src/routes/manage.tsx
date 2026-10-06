import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Plus,
  FolderPlus,
  Upload,
  Archive,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { ImportDialog } from "@/components/manage/import-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/lib/supabase";
import { useBudget } from "@/queries/use-budget";
import { useCategories, type Category } from "@/queries/use-categories";
import { useItems, type ItemWithCategory } from "@/queries/use-items";
import { groupItemsByCategory } from "@/lib/format/tree-sort";
import { CategoryTree } from "@/components/manage/category-tree";
import { CategoryFormDialog } from "@/components/manage/category-form-dialog";
import { PersonList } from "@/components/manage/person-list";
import { TemplateList } from "@/components/manage/template-list";
import { IncomeTemplateList } from "@/components/manage/income-template-list";
import {
  useArchiveCategory,
  useDeleteCategory,
} from "@/queries/use-category-mutations";
import { useArchiveItem, useDeleteItem } from "@/queries/use-item-mutations";

export function Manage() {
  const { budgetId } = useParams<{ budgetId: string }>();
  const [showArchived, setShowArchived] = useState(false);

  const budgetQuery = useBudget(budgetId);
  const categoriesQuery = useCategories(budgetId, {
    includeArchived: showArchived,
  });
  const itemsQuery = useItems(budgetId, { includeArchived: showArchived });

  if (!budgetId) return null;

  const isLoading = categoriesQuery.isLoading || itemsQuery.isLoading;
  const error = categoriesQuery.error || itemsQuery.error;

  const currency = budgetQuery.data?.currency ?? "PKR";
  const allCategories = categoriesQuery.data ?? [];
  const allItems = itemsQuery.data ?? [];

  // Split into active and archived for the two UI sections.
  const activeCategories = allCategories.filter((c) => !c.is_archived);
  const activeItems = allItems.filter((i) => !i.is_archived);
  const archivedCategories = allCategories.filter((c) => c.is_archived);

  // Archived items whose parent category is still active — explicitly
  // archived without archiving the whole category. Items inside an archived
  // category are shown via the category row, not separately.
  const archivedCategoryIds = new Set(archivedCategories.map((c) => c.id));
  const standaloneArchivedItems = allItems.filter(
    (i) => i.is_archived && !archivedCategoryIds.has(i.category?.id ?? ""),
  );

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <section>
        <Header
          budgetId={budgetId}
          showArchived={showArchived}
          onToggleArchived={() => setShowArchived((v) => !v)}
        />

        {isLoading && <ManageSkeleton />}
        {error && <ErrorState message={(error as Error).message} />}

        {/* Empty state only applies to the active view. */}
        {!isLoading && !error && activeCategories.length === 0 && !showArchived && (
          <EmptyState budgetId={budgetId} />
        )}

        {!isLoading && !error && activeCategories.length > 0 && (
          <CategoryTree
            budgetId={budgetId}
            categories={activeCategories}
            groups={groupItemsByCategory(activeCategories, activeItems)}
          />
        )}

        {showArchived && !isLoading && !error && (
          <ArchivedSection
            budgetId={budgetId}
            archivedCategories={archivedCategories}
            standaloneArchivedItems={standaloneArchivedItems}
          />
        )}
      </section>

      <PersonList budgetId={budgetId} />

      <TemplateList
        budgetId={budgetId}
        currency={currency}
        categories={activeCategories}
        items={activeItems}
      />

      <IncomeTemplateList budgetId={budgetId} currency={currency} />
    </div>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────

function Header({
  budgetId,
  showArchived,
  onToggleArchived,
}: {
  budgetId: string;
  showArchived: boolean;
  onToggleArchived: () => void;
}) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-y-2 mb-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          Categories & items
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Set up the structure of this budget. Add categories like Groceries or
          Vehicle, then items underneath.
        </p>
      </div>
      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleArchived}
          className={showArchived ? "text-foreground" : "text-muted-foreground"}
        >
          <Archive className="w-4 h-4 mr-1.5" />
          {showArchived ? "Hide archived" : "Archived"}
        </Button>
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
              className="bg-accent-solid hover:bg-accent-solid-hover text-white"
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

// ─── Archived section ─────────────────────────────────────────────────────────

function ArchivedSection({
  budgetId,
  archivedCategories,
  standaloneArchivedItems,
}: {
  budgetId: string;
  archivedCategories: Category[];
  standaloneArchivedItems: ItemWithCategory[];
}) {
  const hasAny =
    archivedCategories.length > 0 || standaloneArchivedItems.length > 0;

  return (
    <div className="mt-6">
      <h2 className="text-sm font-medium text-muted-foreground mb-2 px-1">
        Archived
      </h2>
      {!hasAny ? (
        <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          No archived categories or items.
        </div>
      ) : (
        <div className="space-y-1">
          {archivedCategories.map((category) => (
            <ArchivedCategoryRow
              key={category.id}
              budgetId={budgetId}
              category={category}
            />
          ))}
          {standaloneArchivedItems.map((item) => (
            <ArchivedItemRow key={item.id} budgetId={budgetId} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function ArchivedCategoryRow({
  budgetId,
  category,
}: {
  budgetId: string;
  category: Category;
}) {
  const restoreCategory = useArchiveCategory();
  const deleteCategory = useDeleteCategory();

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg border border-border/40 bg-muted/20">
      <Archive className="w-4 h-4 shrink-0 text-muted-foreground" />
      <span className="text-sm font-medium truncate flex-1">
        {category.name}
      </span>
      <Badge variant="secondary" className="text-xs shrink-0">
        Category
      </Badge>
      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          disabled={restoreCategory.isPending}
          onClick={() =>
            restoreCategory.mutate({
              id: category.id,
              budgetId,
              archived: false,
            })
          }
        >
          <RotateCcw className="w-3 h-3 mr-1" />
          Restore
        </Button>
        <PermanentDeleteDialog
          type="category"
          id={category.id}
          name={category.name}
          isPending={deleteCategory.isPending}
          onConfirm={() =>
            deleteCategory.mutate({ id: category.id, budgetId })
          }
          trigger={
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Delete
            </Button>
          }
        />
      </div>
    </div>
  );
}

function ArchivedItemRow({
  budgetId,
  item,
}: {
  budgetId: string;
  item: ItemWithCategory;
}) {
  const restoreItem = useArchiveItem();
  const deleteItem = useDeleteItem();

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg border border-border/40 bg-muted/20">
      <Archive className="w-4 h-4 shrink-0 text-muted-foreground" />
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span className="text-sm truncate">{item.name}</span>
        {item.category && (
          <span className="text-xs text-muted-foreground shrink-0">
            in {item.category.name}
          </span>
        )}
      </div>
      <Badge variant="outline" className="text-xs shrink-0">
        Item
      </Badge>
      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          disabled={restoreItem.isPending}
          onClick={() =>
            restoreItem.mutate({ id: item.id, budgetId, archived: false })
          }
        >
          <RotateCcw className="w-3 h-3 mr-1" />
          Restore
        </Button>
        <PermanentDeleteDialog
          type="item"
          id={item.id}
          name={item.name}
          isPending={deleteItem.isPending}
          onConfirm={() => deleteItem.mutate({ id: item.id, budgetId })}
          trigger={
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Delete
            </Button>
          }
        />
      </div>
    </div>
  );
}

// ─── Permanent delete dialog ──────────────────────────────────────────────────

function PermanentDeleteDialog({
  type,
  id,
  name,
  isPending,
  onConfirm,
  trigger,
}: {
  type: "category" | "item";
  id: string;
  name: string;
  isPending: boolean;
  onConfirm: () => void;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  // Fetch transaction count only when the dialog opens — avoids a
  // background query for every row in the archived list.
  const countQuery = useQuery({
    queryKey: ["txCount", type, id],
    enabled: open,
    queryFn: async (): Promise<number> => {
      if (type === "item") {
        const { count, error } = await supabase
          .from("transactions")
          .select("id", { count: "exact", head: true })
          .eq("item_id", id);
        if (error) throw error;
        return count ?? 0;
      }
      // Category: two-hop count — items in category → transactions on those items
      const { data: categoryItems, error: itemError } = await supabase
        .from("items")
        .select("id")
        .eq("category_id", id);
      if (itemError) throw itemError;
      if (!categoryItems?.length) return 0;
      const { count, error: txError } = await supabase
        .from("transactions")
        .select("id", { count: "exact", head: true })
        .in(
          "item_id",
          categoryItems.map((i) => i.id),
        );
      if (txError) throw txError;
      return count ?? 0;
    },
  });

  const count = countQuery.data ?? 0;
  const txLabel = countQuery.isLoading
    ? "calculating…"
    : `${count} transaction${count !== 1 ? "s" : ""}`;

  const consequence =
    type === "category"
      ? `Deleting "${name}" will also permanently delete all items under it and their ${txLabel}.`
      : `Deleting "${name}" will also permanently delete its ${txLabel}.`;

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Permanently delete {name}?</AlertDialogTitle>
          <AlertDialogDescription>
            {consequence} This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isPending || countQuery.isLoading}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            {isPending ? "Deleting…" : "Delete permanently"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── Loading / error / empty states ──────────────────────────────────────────

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
              className="bg-accent-solid hover:bg-accent-solid-hover text-white"
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
