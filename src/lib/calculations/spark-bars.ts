export interface SparkBar {
  yearMonth: string;
  total: number;
  /** 0 to 1, relative to the biggest month shown. */
  height: number;
}

/** One bar per month, scaled to the largest. All zero when nothing was spent. */
export function sparkBars(months: string[], totals: Record<string, number>): SparkBar[] {
  const values = months.map((m) => Math.max(0, totals[m] ?? 0));
  const max = Math.max(0, ...values);
  return months.map((yearMonth, i) => ({
    yearMonth,
    total: values[i],
    height: max === 0 ? 0 : values[i] / max,
  }));
}
