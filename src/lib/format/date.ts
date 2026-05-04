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