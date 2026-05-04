/**
 * Calculate what percentage `part` is of `total`, rounded to 2 decimals.
 *
 * Used in monthly summaries: e.g., "Groceries: 28.5% of monthly spending."
 *
 * Returns 0 (not NaN/Infinity) when total is 0, so empty-month UIs don't break.
 * Throws on negative inputs — spending and totals can't be negative, so silently
 * computing something for invalid input would hide bugs.
 */
export function calculatePercentContribution(
  part: number,
  total: number,
): number {
  if (part < 0 || total < 0) {
    throw new Error(
      "calculatePercentContribution: negative values not allowed",
    );
  }
  if (total === 0) {
    return 0;
  }
  // Multiply by 10000 then divide by 100 to round to 2 decimals.
  // Doing it as `* 100 / 100` would lose precision due to JS floating-point.
  return Math.round((part / total) * 10000) / 100;
}