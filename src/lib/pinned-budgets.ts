const key = (userId: string) => `hisaab:pinned-budgets:${userId}`;

export function readPinned(userId: string): string[] {
  try {
    const raw = localStorage.getItem(key(userId));
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export function writePinned(userId: string, ids: string[]): void {
  try {
    localStorage.setItem(key(userId), JSON.stringify(ids));
  } catch {
    /* storage unavailable: pins just won't persist */
  }
}

/** Add the id if absent, remove it if present. Returns a new list. */
export function togglePinned(pinned: readonly string[], id: string): string[] {
  return pinned.includes(id) ? pinned.filter((p) => p !== id) : [...pinned, id];
}

/** Pinned budgets first (in the order they were pinned), then the rest as given. */
export function pinnedFirst<T extends { id: string }>(items: T[], pinned: readonly string[]): T[] {
  const byId = new Map(items.map((i) => [i.id, i]));
  const top = pinned.flatMap((id) => {
    const item = byId.get(id);
    return item ? [item] : [];
  });
  const rest = items.filter((i) => !pinned.includes(i.id));
  return [...top, ...rest];
}
