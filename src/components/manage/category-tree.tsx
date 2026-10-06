import { useState } from "react";
import {
  ChevronRight,
  Users,
  Pencil,
  Archive,
  Plus,
  PackageOpen,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CategoryFormDialog } from "@/components/manage/category-form-dialog";
import { ItemFormDialog } from "@/components/manage/item-form-dialog";
import { ArchiveConfirmDialog } from "@/components/manage/archive-confirm-dialog";
import { useArchiveCategory } from "@/queries/use-category-mutations";
import { useArchiveItem } from "@/queries/use-item-mutations";
import type { CategoryGroup } from "@/lib/format/tree-sort";
import type { Category } from "@/queries/use-categories";
import type { ItemWithCategory } from "@/queries/use-items";

interface CategoryTreeProps {
  budgetId: string;
  categories: Category[]; // flat list, needed for item dialog category picker
  groups: CategoryGroup[];
}

export function CategoryTree({ budgetId, categories, groups }: CategoryTreeProps) {
  return (
    <div className="space-y-2">
      {groups.map((group) => (
        <CategoryRow
          key={group.category.id}
          budgetId={budgetId}
          categories={categories}
          group={group}
        />
      ))}
    </div>
  );
}

function CategoryRow({
  budgetId,
  categories,
  group,
}: {
  budgetId: string;
  categories: Category[];
  group: CategoryGroup;
}) {
  const [open, setOpen] = useState(false);
  const archiveCategory = useArchiveCategory();
  const itemCount = group.items.length;

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="rounded-lg glass overflow-hidden"
    >
      <div className="flex items-center gap-2 px-3 py-2 hover:bg-muted/30 transition-colors">
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="icon" className="w-8 h-8 shrink-0">
            <ChevronRight
              className={`w-4 h-4 transition-transform ${open ? "rotate-90" : ""}`}
            />
            <span className="sr-only">
              {open ? "Collapse" : "Expand"} {group.category.name}
            </span>
          </Button>
        </CollapsibleTrigger>

        <div className="min-w-0 flex-1 flex items-center gap-2 flex-wrap">
          <span className="font-medium truncate">{group.category.name}</span>

          {group.category.tracks_person && (
            <Badge variant="secondary" className="text-xs gap-1 font-normal">
              <Users className="w-3 h-3" />
              <span>Per-person</span>
            </Badge>
          )}

          <span className="text-xs text-muted-foreground">
            {itemCount} {itemCount === 1 ? "item" : "items"}
          </span>
        </div>

        <div className="ml-auto flex items-center gap-1 shrink-0">
          <CategoryFormDialog
            budgetId={budgetId}
            existing={group.category}
            trigger={
              <Button variant="ghost" size="icon" className="w-8 h-8">
                <Pencil className="w-3.5 h-3.5" />
                <span className="sr-only">Edit {group.category.name}</span>
              </Button>
            }
          />
          <ArchiveConfirmDialog
            name={group.category.name}
            kind="category"
            isPending={archiveCategory.isPending}
            onConfirm={() =>
              archiveCategory.mutate({
                id: group.category.id,
                budgetId,
              })
            }
            trigger={
              <Button variant="ghost" size="icon" className="w-8 h-8">
                <Archive className="w-3.5 h-3.5" />
                <span className="sr-only">Archive {group.category.name}</span>
              </Button>
            }
          />
        </div>
      </div>

      <CollapsibleContent>
        <div className="border-t border-border/40 bg-muted/20 px-3 py-2 space-y-0.5">
          {group.items.length === 0 ? (
            <EmptyItemsRow />
          ) : (
            group.items.map((item) => (
              <ItemRow
                key={item.id}
                budgetId={budgetId}
                categories={categories}
                item={item}
              />
            ))
          )}
          <div className="pt-1">
            <ItemFormDialog
              budgetId={budgetId}
              categories={categories}
              defaultCategoryId={group.category.id}
              trigger={
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-7 text-muted-foreground"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add item
                </Button>
              }
            />
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function ItemRow({
  budgetId,
  categories,
  item,
}: {
  budgetId: string;
  categories: Category[];
  item: ItemWithCategory;
}) {
  const archiveItem = useArchiveItem();

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-background transition-colors group">
      <div className="w-4 shrink-0" />
      <div className="min-w-0 flex-1 flex items-center gap-2 flex-wrap">
        <span className="text-sm truncate">{item.name}</span>

        {item.unit && (
          <span className="text-xs text-muted-foreground">· {item.unit}</span>
        )}

        {item.default_rate !== null && (
          <span className="text-xs text-muted-foreground">
            · default {item.default_rate}
          </span>
        )}

        {item.default_mode === "rate_qty" && (
          <Badge variant="outline" className="text-[10px] py-0 h-4 font-normal">
            rate × qty
          </Badge>
        )}
      </div>

      <div className="ml-auto shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex items-center gap-1">
        <ItemFormDialog
          budgetId={budgetId}
          categories={categories}
          existing={item}
          trigger={
            <Button variant="ghost" size="icon" className="w-10 h-10 sm:w-7 sm:h-7">
              <Pencil className="w-3 h-3" />
              <span className="sr-only">Edit {item.name}</span>
            </Button>
          }
        />
        <ArchiveConfirmDialog
          name={item.name}
          kind="item"
          isPending={archiveItem.isPending}
          onConfirm={() =>
            archiveItem.mutate({
              id: item.id,
              budgetId,
            })
          }
          trigger={
            <Button variant="ghost" size="icon" className="w-10 h-10 sm:w-7 sm:h-7">
              <Archive className="w-3 h-3" />
              <span className="sr-only">Archive {item.name}</span>
            </Button>
          }
        />
      </div>
    </div>
  );
}

function EmptyItemsRow() {
  return (
    <div className="flex items-center gap-2 px-2 py-2 text-sm text-muted-foreground italic">
      <PackageOpen className="w-3.5 h-3.5" />
      No items yet.
    </div>
  );
}