/**
 * Format a Date as YYYY-MM-DD using the local timezone.
 *
 * Why not toISOString().slice(0, 10)?
 * Because toISOString() converts to UTC first. In timezones east of UTC,
 * this can return yesterday's date during late-night hours. We want the
 * user's local calendar date.
 */
export function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Returns today's date in the user's local timezone as YYYY-MM-DD.
 */
export function todayISO(): string {
  return toISODate(new Date());
}

/**
 * Add (or subtract) days from an ISO date string. Returns a new ISO date string.
 * Uses local timezone — important for the day-view navigation where
 * "tomorrow" should match the user's calendar, not UTC.
 */
export function addDays(isoDate: string, days: number): string {
  const [yearStr, monthStr, dayStr] = isoDate.split("-");
  const date = new Date(
    Number(yearStr),
    Number(monthStr) - 1,
    Number(dayStr),
  );
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

/**
 * Format an ISO date as a friendly display string in the user's locale.
 * e.g. "Tue, May 5" or "Today" / "Yesterday" if applicable.
 */
export function formatDayLabel(isoDate: string): string {
  if (isoDate === todayISO()) return "Today";
  if (isoDate === addDays(todayISO(), -1)) return "Yesterday";
  if (isoDate === addDays(todayISO(), 1)) return "Tomorrow";

  const [yearStr, monthStr, dayStr] = isoDate.split("-");
  const date = new Date(
    Number(yearStr),
    Number(monthStr) - 1,
    Number(dayStr),
  );
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

