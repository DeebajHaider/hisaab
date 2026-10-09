export interface Rates {
  /** Share of income not spent (income minus expenses, over income). Negative when overspent. */
  keptPercent: number | null;
  /** Share of income explicitly put into savings. */
  savedPercent: number | null;
}

/** Savings rates for a month. Null when there is no income to take a share of. */
export function calculateRates(input: {
  income: number;
  expenses: number;
  savings: number;
}): Rates {
  const { income, expenses, savings } = input;
  if (income <= 0) return { keptPercent: null, savedPercent: null };
  return {
    keptPercent: ((income - expenses) / income) * 100,
    savedPercent: (savings / income) * 100,
  };
}
