import { addDays } from "@/lib/format/date";
import { evaluateAmount } from "@/lib/calculations/evaluate-amount";
import { normalizeTag } from "@/lib/tags";
import { rankItems } from "@/lib/search/rank-items";
import type { ItemWithCategory } from "@/queries/use-items";

export type QuickEntry =
  | { ok: true; item: ItemWithCategory; amount: number; date: string; tags: string[] }
  | { ok: false; reason: string };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** A bare amount token: a number, a sum like 120+80, or a shorthand like 1.5k. */
function readAmount(token: string): number | null {
  const k = /^(\d+(?:\.\d+)?)k$/i.exec(token);
  if (k) return Math.round(Number(k[1]) * 1000 * 100) / 100;
  if (!/^[\d.,+\-*/x×÷()]+$/i.test(token) || !/\d/.test(token)) return null;
  return evaluateAmount(token);
}

/**
 * Turn one line like "chai 120", "petrol 4,250 yesterday" or "gym 5k #health"
 * into an item, an amount, a date and tags. `defaultDate` is used when no date
 * word is given (the day being viewed). Nothing is guessed: if the item can't
 * be found or the amount can't be read, it says why instead.
 */
export function parseQuickEntry(
  text: string,
  items: ItemWithCategory[],
  today: string,
  defaultDate: string,
): QuickEntry {
  const tokens = text.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return { ok: false, reason: "" };

  let date = defaultDate;
  const tags: string[] = [];
  const words: string[] = [];
  for (const token of tokens) {
    const lower = token.toLowerCase();
    if (lower === "today") date = today;
    else if (lower === "yesterday" || lower === "yday") date = addDays(today, -1);
    else if (ISO_DATE.test(token)) date = token;
    else if (token.startsWith("#")) {
      const tag = normalizeTag(token);
      if (tag && !tags.includes(tag)) tags.push(tag);
    } else words.push(token);
  }

  // The amount is the last word that reads as one; the rest name the item.
  let amountIndex = -1;
  for (let i = words.length - 1; i >= 0; i--) {
    if (readAmount(words[i]) !== null) {
      amountIndex = i;
      break;
    }
  }
  if (amountIndex === -1) return { ok: false, reason: "Add an amount, like “chai 120”." };

  const amount = readAmount(words[amountIndex])!;
  if (amount <= 0) return { ok: false, reason: "The amount has to be more than zero." };

  const name = words.filter((_, i) => i !== amountIndex).join(" ");
  if (!name) return { ok: false, reason: "Start with the item, like “chai 120”." };

  const exact = items.find((i) => i.name.toLowerCase() === name.toLowerCase());
  const item = exact ?? rankItems({ query: name, items, recent: [], limit: 1 })[0];
  if (!item) return { ok: false, reason: `No item matches “${name}”.` };

  return { ok: true, item, amount, date, tags };
}
