import { useState } from "react";
import { Plus, Pencil, Archive, ArchiveRestore } from "lucide-react";
import { useTemplates, type TemplateWithRelations } from "@/queries/use-templates";
import { useArchiveTemplate } from "@/queries/use-template-mutations";
import { TemplateFormDialog } from "./template-form-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Category } from "@/queries/use-categories";
import type { ItemWithCategory } from "@/queries/use-items";

interface TemplateListProps {
  budgetId: string;
  currency: string;
  categories: Category[];
  items: ItemWithCategory[];
}

function formatAmount(amount: number, currency: string): string {
  return `${currency} ${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Quick-add template management for the Manage page. Mirrors PersonList's
 * structure (flat list, no nesting) — templates aren't a taxonomy, they're
 * saved transaction presets that show up as one-click buttons on Day view.
 */
export function TemplateList({ budgetId, currency, categories, items }: TemplateListProps) {
  const templatesQuery = useTemplates(budgetId, { includeArchived: true });
  const [showArchived, setShowArchived] = useState(false);

  const all = templatesQuery.data ?? [];
  const active = all.filter((t) => !t.is_archived);
  const archived = all.filter((t) => t.is_archived);

  const canCreate = categories.length > 0 && items.length > 0;

  return (
    <section className="mt-10">
      <SectionHeader
        budgetId={budgetId}
        categories={categories}
        items={items}
        showAddButton={active.length > 0 && canCreate}
      />

      {templatesQuery.isLoading ? (
        <ListSkeleton />
      ) : active.length === 0 && archived.length === 0 ? (
        <EmptyState budgetId={budgetId} categories={categories} items={items} canCreate={canCreate} />
      ) : (
        <div className="space-y-2">
          {active.map((template) => (
            <TemplateRow
              key={template.id}
              template={template}
              budgetId={budgetId}
              currency={currency}
              categories={categories}
              items={items}
            />
          ))}

          {archived.length > 0 && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowArchived((v) => !v)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {showArchived ? "Hide" : "Show"} archived ({archived.length})
              </button>

              {showArchived && (
                <div className="space-y-2 mt-2">
                  {archived.map((template) => (
                    <TemplateRow
                      key={template.id}
                      template={template}
                      budgetId={budgetId}
                      currency={currency}
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
    </section>
  );
}

function SectionHeader({
  budgetId,
  categories,
  items,
  showAddButton,
}: {
  budgetId: string;
  categories: Category[];
  items: ItemWithCategory[];
  showAddButton: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Templates</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-xl">
          Saved transactions you can add with one click from the Day view — rent,
          subscriptions, anything you log the same way every time.
        </p>
      </div>
      {showAddButton && (
        <TemplateFormDialog
          budgetId={budgetId}
          categories={categories}
          items={items}
          trigger={
            <Button size="sm" className="bg-accent-solid hover:bg-accent-solid-hover text-white">
              <Plus className="w-4 h-4 mr-1.5" />
              New template
            </Button>
          }
        />
      )}
    </div>
  );
}

function TemplateRow({
  template,
  budgetId,
  currency,
  categories,
  items,
}: {
  template: TemplateWithRelations;
  budgetId: string;
  currency: string;
  categories: Category[];
  items: ItemWithCategory[];
}) {
  const archive = useArchiveTemplate();
  const displayName = template.label || template.item?.name || "Unknown item";

  return (
    <div
      className={`flex items-center gap-3 rounded-md border border-border/60 px-3 py-2.5 ${
        template.is_archived ? "opacity-60" : ""
      }`}
    >
      <div className="min-w-0 flex-1 flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium truncate">{displayName}</span>
        <span className="text-xs text-muted-foreground">
          {formatAmount(template.amount, currency)}
        </span>
        {template.category && (
          <span className="text-xs text-muted-foreground">· {template.category.name}</span>
        )}
        {template.person && (
          <span className="text-xs text-muted-foreground">· {template.person.name}</span>
        )}
        {template.is_archived && (
          <span className="text-xs text-muted-foreground">(archived)</span>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {!template.is_archived && (
          <TemplateFormDialog
            budgetId={budgetId}
            categories={categories}
            items={items}
            existing={template}
            trigger={
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                aria-label={`Edit ${displayName}`}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            }
          />
        )}
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          disabled={archive.isPending}
          onClick={() =>
            archive.mutate({
              id: template.id,
              budgetId,
              archived: !template.is_archived,
            })
          }
          aria-label={template.is_archived ? `Unarchive ${displayName}` : `Archive ${displayName}`}
          title={template.is_archived ? "Unarchive" : "Archive"}
        >
          {template.is_archived ? (
            <ArchiveRestore className="h-4 w-4" />
          ) : (
            <Archive className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

function EmptyState({
  budgetId,
  categories,
  items,
  canCreate,
}: {
  budgetId: string;
  categories: Category[];
  items: ItemWithCategory[];
  canCreate: boolean;
}) {
  return (
    <div className="rounded-lg border border-dashed border-border p-8 text-center">
      <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
        {canCreate
          ? "No templates yet. Add one for something you log the same way every time."
          : "Set up a category and item first, then come back to add templates."}
      </p>
      {canCreate && (
        <TemplateFormDialog
          budgetId={budgetId}
          categories={categories}
          items={items}
          trigger={
            <Button size="sm" className="bg-accent-solid hover:bg-accent-solid-hover text-white">
              <Plus className="w-4 h-4 mr-1.5" />
              Add template
            </Button>
          }
        />
      )}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-2">
      {[0, 1].map((i) => (
        <div
          key={i}
          className="rounded-md border border-border/60 px-3 py-2.5 flex items-center gap-3"
        >
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-8 w-8 ml-auto" />
          <Skeleton className="h-8 w-8" />
        </div>
      ))}
    </div>
  );
}
