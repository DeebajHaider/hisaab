import type { Transaction } from "@/queries/use-transactions";

export const KEEP_DAYS = 30;
export const MAX_KEPT = 50;
const DAY_MS = 86_400_000;

/** A deleted transaction, kept on this device so it can be put back later. */
export interface DeletedRecord {
  deletedAt: number;
  row: Transaction;
  itemName: string | null;
  categoryName: string | null;
}

type Deletable = Transaction & {
  item?: { name: string } | null;
  category?: { name: string } | null;
};

const key = (userId: string, budgetId: string) => `hisaab:deleted:${userId}:${budgetId}`;

function isRecord(value: unknown): value is DeletedRecord {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  const row = v.row as Record<string, unknown> | null;
  return (
    typeof v.deletedAt === "number" &&
    typeof row === "object" &&
    row !== null &&
    typeof row.id === "string" &&
    typeof row.budget_id === "string"
  );
}

/** Drop records past the retention window, newest first, capped. */
export function pruneDeleted(records: DeletedRecord[], now: number): DeletedRecord[] {
  return records
    .filter((r) => now - r.deletedAt <= KEEP_DAYS * DAY_MS)
    .sort((a, b) => b.deletedAt - a.deletedAt)
    .slice(0, MAX_KEPT);
}

export function readDeleted(userId: string, budgetId: string, now = Date.now()): DeletedRecord[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key(userId, budgetId)) ?? "[]");
    return Array.isArray(parsed) ? pruneDeleted(parsed.filter(isRecord), now) : [];
  } catch {
    return [];
  }
}

function write(userId: string, budgetId: string, records: DeletedRecord[]) {
  try {
    localStorage.setItem(key(userId, budgetId), JSON.stringify(records));
  } catch {
    /* storage unavailable or full: the Undo toast still works */
  }
}

/** Remember just-deleted rows. A row already remembered is replaced, not duplicated. */
export function recordDeleted(
  userId: string,
  budgetId: string,
  rows: Deletable[],
  now = Date.now(),
): void {
  const incoming = rows.map<DeletedRecord>(({ item, category, ...row }) => ({
    deletedAt: now,
    row: row as Transaction,
    itemName: item?.name ?? null,
    categoryName: category?.name ?? null,
  }));
  const ids = new Set(incoming.map((r) => r.row.id));
  const kept = readDeleted(userId, budgetId, now).filter((r) => !ids.has(r.row.id));
  write(userId, budgetId, pruneDeleted([...incoming, ...kept], now));
}

/** Forget rows, because they were restored. */
export function forgetDeleted(userId: string, budgetId: string, ids: string[]): void {
  const gone = new Set(ids);
  write(
    userId,
    budgetId,
    readDeleted(userId, budgetId).filter((r) => !gone.has(r.row.id)),
  );
}
