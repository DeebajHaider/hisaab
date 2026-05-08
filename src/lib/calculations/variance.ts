interface VarianceInput {
  income: number;
  expenses: number;
  savings: number;
}

/**
 * Variance = income - expenses - savings.
 *
 * Positive: surplus (you came out ahead).
 * Negative: deficit (you spent + saved more than you earned).
 * Zero: balanced exactly.
 *
 * Float-safe: arithmetic happens in integer cents to avoid IEEE 754 drift.
 * Same trick used by calculateDayTotal and calculateMonthSummary.
 */
export function calculateVariance({ income, expenses, savings }: VarianceInput): number {
  const incomeCents = Math.round(income * 100);
  const expenseCents = Math.round(expenses * 100);
  const savingsCents = Math.round(savings * 100);
  return (incomeCents - expenseCents - savingsCents) / 100;
}