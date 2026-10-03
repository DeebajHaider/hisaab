/** Build a case-insensitive "contains" pattern for ilike, with the user's
 *  text taken literally (so "50%" doesn't match everything starting "50").
 *  Returns null for blank input. */
export function containsPattern(query: string): string | null {
  const trimmed = query.trim();
  if (trimmed === "") return null;
  return `%${trimmed.replace(/[\\%_]/g, "\\$&")}%`;
}
