import type { Category } from "@/queries/use-categories";
import type { ItemWithCategory } from "@/queries/use-items";

export interface CategoryGroup {
  category: Category;
  items: ItemWithCategory[];
}

/**
 * Group items by category and sort hierarchically.
 *
 * - Categories sorted by sort_order ascending, ties broken by name
 * - Items within each category sorted by sort_order ascending, ties broken by name
 * - Items referencing missing categories are dropped (defensive — should not
 *   happen with our schema, but keeps the UI from crashing on stale data)
 */
export function groupItemsByCategory(
  categories: Category[],
  items: ItemWithCategory[],
): CategoryGroup[] {
  // Sort categories first so the output preserves order
  const sortedCategories = [...categories].sort(compareSortable);

  // Build a lookup: category_id → items in that category
  const itemsByCategory = new Map<string, ItemWithCategory[]>();
  for (const item of items) {
    const list = itemsByCategory.get(item.category_id);
    if (list) {
      list.push(item);
    } else {
      itemsByCategory.set(item.category_id, [item]);
    }
  }

  // Build groups, sorting items within each category
  return sortedCategories.map((category) => ({
    category,
    items: (itemsByCategory.get(category.id) ?? []).slice().sort(compareSortable),
  }));
}

// Both Category and ItemWithCategory have these fields, so we type by structure
function compareSortable(
  a: { sort_order: number; name: string },
  b: { sort_order: number; name: string },
): number {
  if (a.sort_order !== b.sort_order) {
    return a.sort_order - b.sort_order;
  }
  return a.name.localeCompare(b.name);
}