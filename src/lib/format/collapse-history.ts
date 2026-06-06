// Reshape raw value-history rows into one point per day for the progression
// graph. Several rows can share an as_of date (create + a same-day update, or
// two updates in a day), so we keep the latest entry per day by created_at —
// that day's final recorded value — and return points sorted oldest-first.
export interface DailyValuePoint {
  date: string; // YYYY-MM-DD (the as_of day)
  value: number;
}

interface HistoryInput {
  as_of: string;
  value: number;
  created_at: string;
}

export function collapseHistoryByDay(rows: HistoryInput[]): DailyValuePoint[] {
  const latestByDay = new Map<string, HistoryInput>();
  for (const r of rows) {
    const existing = latestByDay.get(r.as_of);
    // created_at is an ISO timestamp, so a lexical comparison matches chronology.
    if (!existing || r.created_at > existing.created_at) {
      latestByDay.set(r.as_of, r);
    }
  }
  return [...latestByDay.values()]
    .map((r) => ({ date: r.as_of, value: r.value }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
