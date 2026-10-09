export interface HeatCell {
  /** ISO date, or null for the blank cells padding the first and last week. */
  date: string | null;
  total: number;
  /** 0 (nothing) to 4 (heaviest day of the month). */
  level: 0 | 1 | 2 | 3 | 4;
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * A month as rows of seven days, Monday first, with each day's spend bucketed
 * into five intensity levels relative to the heaviest day.
 */
export function buildHeatmap(
  yearMonth: string,
  spends: { date: string; amount: number }[],
): HeatCell[][] {
  const [year, month] = yearMonth.split("-").map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  const lead = (new Date(year, month - 1, 1).getDay() + 6) % 7; // Monday = 0

  const cents = new Map<string, number>();
  for (const s of spends) {
    cents.set(s.date, (cents.get(s.date) ?? 0) + Math.round(s.amount * 100));
  }
  const max = Math.max(0, ...cents.values());

  const cells: HeatCell[] = Array.from({ length: lead }, () => ({
    date: null,
    total: 0,
    level: 0,
  }));
  for (let day = 1; day <= daysInMonth; day++) {
    const date = `${yearMonth}-${pad(day)}`;
    const total = (cents.get(date) ?? 0) / 100;
    const level =
      total <= 0 || max === 0 ? 0 : (Math.min(4, Math.max(1, Math.ceil((total * 100 * 4) / max))) as 1 | 2 | 3 | 4);
    cells.push({ date, total, level });
  }
  while (cells.length % 7 !== 0) cells.push({ date: null, total: 0, level: 0 });

  const weeks: HeatCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}
