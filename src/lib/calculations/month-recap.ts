import { compareCategories } from "./month-compare";

interface Spend {
  date: string;
  amount: number;
  category: { name: string } | null;
}

export interface RecapLine {
  tone: "good" | "bad" | "neutral";
  text: string;
}

const sum = (list: Spend[]) => list.reduce((s, t) => s + Math.round(t.amount * 100), 0) / 100;

/**
 * A few plain-language observations about a month. Spending is compared to
 * the previous month over the same days, so a month in progress isn't judged
 * against a finished one. `daysElapsed` is how many days of the month count.
 */
export function buildRecap(input: {
  current: Spend[];
  previous: Spend[];
  daysElapsed: number;
  totalDays: number;
  format: (amount: number) => string;
}): RecapLine[] {
  const { current, previous, daysElapsed, totalDays, format } = input;
  if (current.length === 0 || daysElapsed <= 0) return [];

  const lines: RecapLine[] = [];
  const dayOf = (iso: string) => Number(iso.slice(-2));
  const comparablePrevious = previous.filter((t) => dayOf(t.date) <= daysElapsed);

  // Overall change against the same stretch of last month.
  const now = sum(current);
  const before = sum(comparablePrevious);
  if (before > 0) {
    const change = ((now - before) / before) * 100;
    const rounded = Math.round(Math.abs(change));
    if (rounded === 0) {
      lines.push({ tone: "neutral", text: "Spending is about the same as this point last month." });
    } else {
      lines.push({
        tone: change < 0 ? "good" : "bad",
        text: `You've spent ${rounded}% ${change < 0 ? "less" : "more"} than this point last month (${format(now)} vs ${format(before)}).`,
      });
    }
  }

  // The category that moved most.
  const mover = compareCategories(current, comparablePrevious).find(
    (r) => r.percent !== null && Math.abs(r.diff) > 0,
  );
  if (mover && mover.percent !== null) {
    const down = mover.diff < 0;
    lines.push({
      tone: down ? "good" : "bad",
      text: `${mover.category} is ${down ? "down" : "up"} ${Math.round(Math.abs(mover.percent))}% (${format(Math.abs(mover.diff))} ${down ? "less" : "more"}).`,
    });
  }

  // Where most of the money went.
  const top = compareCategories(current, []).sort((a, b) => b.a - a.a)[0];
  if (top && now > 0) {
    lines.push({
      tone: "neutral",
      text: `${top.category} took the biggest share, ${Math.round((top.a / now) * 100)}% of spending.`,
    });
  }

  // Days with nothing logged, and how consistently you logged.
  const daysWith = new Set(current.map((t) => t.date)).size;
  const noSpend = Math.min(daysElapsed, totalDays) - daysWith;
  if (noSpend > 0) {
    lines.push({
      tone: "good",
      text: `${noSpend} day${noSpend === 1 ? "" : "s"} with nothing logged so far.`,
    });
  }
  lines.push({
    tone: "neutral",
    text: `Logged on ${daysWith} of ${Math.min(daysElapsed, totalDays)} day${daysElapsed === 1 ? "" : "s"}.`,
  });

  return lines;
}
