export const MAX_TAG_LENGTH = 30;
export const MAX_TAGS = 10;

/** A tag as stored: lower case, no leading #, single spaces, capped in length. */
export function normalizeTag(raw: string): string {
  return raw
    .trim()
    .replace(/^#+/, "")
    .replace(/\s+/g, " ")
    .toLowerCase()
    .slice(0, MAX_TAG_LENGTH)
    .trim();
}

/** Add a tag, ignoring blanks, duplicates, and anything past the cap. */
export function addTag(tags: readonly string[], raw: string): string[] {
  const tag = normalizeTag(raw);
  if (!tag || tags.includes(tag) || tags.length >= MAX_TAGS) return [...tags];
  return [...tags, tag];
}

export function removeTag(tags: readonly string[], tag: string): string[] {
  return tags.filter((t) => t !== tag);
}

/** Every tag in use, most used first, then alphabetically. */
export function collectTags(rows: { tags?: string[] | null }[]): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    for (const tag of row.tags ?? []) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}
