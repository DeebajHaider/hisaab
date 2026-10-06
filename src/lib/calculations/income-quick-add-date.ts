import { firstDayOfMonth, type YearMonth } from "@/lib/format/year-month";

/** The date a quick-added income entry gets: today when viewing the current
 *  month, otherwise the 1st of the viewed month (matches the Add income dialog). */
export function incomeQuickAddDate(yearMonth: YearMonth, today: string): string {
  return today.startsWith(`${yearMonth}-`) ? today : firstDayOfMonth(yearMonth);
}
