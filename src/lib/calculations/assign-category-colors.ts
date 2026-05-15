export const CHART_COLOR_COUNT = 10;

/**
 * Deterministic name -> CSS-variable mapping. Hashes the category name
 * and maps to one of the 10 chart palette slots defined in index.css.
 *
 * Why deterministic: a given category keeps its color across re-renders,
 * timeframe changes, and re-mounts. Without this, every render would
 * re-shuffle which category is which color, which is visually jarring.
 *
 * Why a hash (not just index): if we used array index, adding a new
 * category in the middle would shift every subsequent category's color.
 * Hash-based assignment is stable across membership changes.
 *
 * Cost: two categories can hash to the same slot, sharing a color.
 * Acceptable since most budgets have <10 categories.
 */
export function assignCategoryColors(
  categoryNames: string[],
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const name of categoryNames) {
    const slot = hashToSlot(name);
    result[name] = `var(--chart-${slot})`;
  }
  return result;
}

/**
 * Simple FNV-1a-style string hash, mapped to 1..CHART_COLOR_COUNT.
 * Not cryptographic — just well-distributed and fast.
 */
function hashToSlot(s: string): number {
  let hash = 2166136261;
  for (let i = 0; i < s.length; i++) {
    hash ^= s.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  // Convert to positive int and mod into 1..N range
  const positive = Math.abs(hash | 0);
  return (positive % CHART_COLOR_COUNT) + 1;
}

