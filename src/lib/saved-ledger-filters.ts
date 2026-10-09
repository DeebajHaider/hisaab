import type { LedgerPreset } from "@/lib/calculations/resolve-ledger-preset";

export interface SavedLedgerFilter {
  id: string;
  name: string;
  /** Set when the date range was a preset, so "This month" stays this month. */
  preset: LedgerPreset | null;
  from: string;
  to: string;
  categoryIds: string[];
  itemIds: string[];
  personIds: string[];
  /** Absent in views saved before tags existed. */
  tags?: string[];
  search: string;
}

export const MAX_NAME_LENGTH = 40;

const key = (userId: string, budgetId: string) => `hisaab:ledger-filters:${userId}:${budgetId}`;

function isSaved(value: unknown): value is SavedLedgerFilter {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  const strings = (x: unknown) => Array.isArray(x) && x.every((s) => typeof s === "string");
  return (
    typeof v.id === "string" &&
    typeof v.name === "string" &&
    typeof v.from === "string" &&
    typeof v.to === "string" &&
    typeof v.search === "string" &&
    strings(v.categoryIds) &&
    strings(v.itemIds) &&
    strings(v.personIds)
  );
}

export function readSavedFilters(userId: string, budgetId: string): SavedLedgerFilter[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key(userId, budgetId)) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter(isSaved) : [];
  } catch {
    return [];
  }
}

export function writeSavedFilters(
  userId: string,
  budgetId: string,
  filters: SavedLedgerFilter[],
): void {
  try {
    localStorage.setItem(key(userId, budgetId), JSON.stringify(filters));
  } catch {
    /* storage unavailable: saved filters just won't persist */
  }
}

/** Add a filter, or replace the one with the same name (case-insensitive). */
export function upsertFilter(
  filters: SavedLedgerFilter[],
  next: SavedLedgerFilter,
): SavedLedgerFilter[] {
  const same = (f: SavedLedgerFilter) => f.name.toLowerCase() === next.name.toLowerCase();
  return filters.some(same)
    ? filters.map((f) => (same(f) ? { ...next, id: f.id } : f))
    : [...filters, next];
}

export function removeFilter(filters: SavedLedgerFilter[], id: string): SavedLedgerFilter[] {
  return filters.filter((f) => f.id !== id);
}

/** A name as stored: trimmed and capped in length. */
export function normalizeName(raw: string): string {
  return raw.trim().slice(0, MAX_NAME_LENGTH);
}
