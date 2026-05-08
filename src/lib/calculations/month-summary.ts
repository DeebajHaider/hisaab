import type { YearMonth } from "@/lib/format/year-month";

/**
 * The minimum subset of a transaction needed to compute a month summary.
 * Loosely typed so any caller producing this shape can use the calculator,
 * not just TransactionWithRelations.
 */
export interface MonthSummaryInput {
  amount: number;
  category: {
    name: string;
    tracks_person: boolean;
  } | null;
  person: {
    name: string;
  } | null;
}

/**
 * Calendar metadata about the month being summarized. Provided by the
 * caller so the calculator stays pure — no Date.now() reads inside.
 */
export interface MonthMeta {
  yearMonth: YearMonth;
  /** Total calendar days in the month (28-31). */
  totalDays: number;
  /**
   * Days elapsed for the average-per-day calculation.
   * For the current month: days-so-far (1-totalDays).
   * For past months: equals totalDays.
   * For future months: 0 (will produce an average of 0).
   */
  daysElapsed: number;
}

export interface MonthSummary {
  totalExpenses: number;
  transactionCount: number;
  averagePerDay: number;
  largestCategory: { name: string; total: number } | null;
  perPerson: { name: string; total: number }[];
}

const UNASSIGNED_LABEL = "Unassigned";

/**
 * Pure summary calculation for a month's transactions.
 *
 * Floating-point safe: amounts are summed in integer cents internally and
 * converted back to dollars at the boundary, mirroring the pattern in
 * day-totals.ts. This matters because a month can include 100+ rows; small
 * IEEE 754 errors compound visibly.
 */
export function calculateMonthSummary(
  transactions: MonthSummaryInput[],
  meta: MonthMeta,
): MonthSummary {
  // --- Total expenses, in cents to avoid float drift ---
  const totalCents = transactions.reduce(
    (sum, t) => sum + Math.round(t.amount * 100),
    0,
  );
  const totalExpenses = totalCents / 100;

  // --- Average per day ---
  const averagePerDay =
    meta.daysElapsed > 0 ? totalExpenses / meta.daysElapsed : 0;

  // --- Largest category by total spend ---
  // Bucket cents by category name; ignore transactions with no category.
  const categoryCents = new Map<string, number>();
  for (const t of transactions) {
    if (!t.category) continue;
    const key = t.category.name;
    const prev = categoryCents.get(key) ?? 0;
    categoryCents.set(key, prev + Math.round(t.amount * 100));
  }

  let largestCategory: MonthSummary["largestCategory"] = null;
  for (const [name, cents] of categoryCents) {
    if (
      !largestCategory ||
      cents > Math.round(largestCategory.total * 100) ||
      // Tie-break alphabetically for stable output
      (cents === Math.round(largestCategory.total * 100) &&
        name.localeCompare(largestCategory.name) < 0)
    ) {
      largestCategory = { name, total: cents / 100 };
    }
  }

  // --- Per-person totals (tracked categories only) ---
  const personCents = new Map<string, number>();
  for (const t of transactions) {
    if (!t.category?.tracks_person) continue;
    const name = t.person?.name ?? UNASSIGNED_LABEL;
    const prev = personCents.get(name) ?? 0;
    personCents.set(name, prev + Math.round(t.amount * 100));
  }

  const perPerson = Array.from(personCents.entries())
    .map(([name, cents]) => ({ name, total: cents / 100 }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    totalExpenses,
    transactionCount: transactions.length,
    averagePerDay,
    largestCategory,
    perPerson,
  };
}
