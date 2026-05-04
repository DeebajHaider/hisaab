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
import type { CategoryGroup } from "@/lib/format/tree-sort";

interface CategoryTreeProps {
  budgetId: string;
  groups: CategoryGroup[];
}

/**
 * Hierarchical view of categories with their items.
 * Each category is collapsible. Buttons for edit/archive/add-item sit on each row.
 */
export function CategoryTree({ groups }: CategoryTreeProps) {
  return (
    <div className="space-y-2">
      {groups.map((group) => (
        <CategoryRow key={group.category.id} group={group} />
      ))}
    </div>
  );
}

function CategoryRow({ group }: { group: CategoryGroup }) {
  // Categories start expanded so the user can see what's inside.
  // We could persist this in localStorage if it became annoying.
  const [open, setOpen] = useState(true);
  const itemCount = group.items.length;

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="rounded-lg border border-border/60 bg-card overflow-hidden"
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

        <span className="font-medium truncate">{group.category.name}</span>

        {group.category.tracks_person && (
          <Badge variant="secondary" className="text-xs gap-1 font-normal">
            <Users className="w-3 h-3" />
            <span>Per-person</span>
          </Badge>
        )}

        <span className="text-xs text-muted-foreground ml-1">
          {itemCount} {itemCount === 1 ? "item" : "items"}
        </span>

        <div className="ml-auto flex items-center gap-1">
          {/* Edit and archive — wired in 2.2c */}
          <Button variant="ghost" size="icon" className="w-8 h-8" disabled>
            <Pencil className="w-3.5 h-3.5" />
            <span className="sr-only">Edit category</span>
          </Button>
          <Button variant="ghost" size="icon" className="w-8 h-8" disabled>
            <Archive className="w-3.5 h-3.5" />
            <span className="sr-only">Archive category</span>
          </Button>
        </div>
      </div>

      <CollapsibleContent>
        <div className="border-t border-border/40 bg-muted/20 px-3 py-2 space-y-0.5">
          {group.items.length === 0 ? (
            <EmptyItemsRow />
          ) : (
            group.items.map((item) => <ItemRow key={item.id} item={item} />)
          )}
          <div className="pt-1">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7 text-muted-foreground"
              disabled
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add item
            </Button>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function ItemRow({ item }: { item: { id: string; name: string; unit: string | null; default_rate: number | null; default_mode: string } }) {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-background transition-colors group">
      <div className="w-4 shrink-0" /> {/* aligns with category chevron */}
      <span className="text-sm">{item.name}</span>

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

      <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
        <Button variant="ghost" size="icon" className="w-7 h-7" disabled>
          <Pencil className="w-3 h-3" />
          <span className="sr-only">Edit item</span>
        </Button>
        <Button variant="ghost" size="icon" className="w-7 h-7" disabled>
          <Archive className="w-3 h-3" />
          <span className="sr-only">Archive item</span>
        </Button>
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