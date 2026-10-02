import { addDays } from "@/lib/format/date";
import { firstDayOfMonth, lastDayOfMonth } from "@/lib/format/year-month";

export type TargetPreset = "this-week" | "this-month";

export const TARGET_PRESETS: TargetPreset[] = ["this-week", "this-month"];

/**
 * Resolve a target preset to a { start, end } ISO date range, seeding the
 * create-target dialog's date fields. "custom" isn't handled here — same
 * as the Ledger's presets, nothing about how the range was chosen is
 * stored; the fields stay freely editable afterward.
 */
export function resolveTargetPreset(
  preset: TargetPreset,
  today: string,
): { start: string; end: string } {
  if (preset === "this-month") {
    return { start: firstDayOfMonth(today.slice(0, 7)), end: lastDayOfMonth(today.slice(0, 7)) };
  }

  // this-week: Monday through Sunday of the week containing `today`.
  const [y, m, d] = today.split("-").map(Number);
  const dayOfWeek = new Date(y, m - 1, d).getDay(); // 0 = Sunday, 1 = Monday, ... 6 = Saturday
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = addDays(today, diffToMonday);
  const sunday = addDays(monday, 6);
  return { start: monday, end: sunday };
}
