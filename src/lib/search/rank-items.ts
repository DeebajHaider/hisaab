import type { ItemWithCategory } from "@/queries/use-items";
import type { RecentItemUsage } from "@/queries/use-recent-items";

interface RankItemsInput {
  query: string;
  items: ItemWithCategory[];
  recent: RecentItemUsage[];
  limit?: number;
}

/**
 * Rank items by relevance to a search query, using recent-usage data as a
 * tiebreaker boost.
 *
 * Scoring (higher = better):
 *   prefix-of-name match      → 1000 base
 *   prefix-of-word match      →  600 base
 *   substring match           →  300 base
 *   no match                  → excluded (returns empty)
 *
 *   recency boost             → up to +200 (today = 200, 30 days ago = 0)
 *   frequency boost           → up to +50 (linear in use count, capped)
 *
 * Empty query: special path that returns recent items first (sorted by
 * recency) and then the rest alphabetically. No score-based filtering.
 *
 * Ties broken by name (localeCompare for proper unicode handling).
 */
export function rankItems({
  query,
  items,
  recent,
  limit = 10,
}: RankItemsInput): ItemWithCategory[] {
  const trimmed = query.trim().toLowerCase();
  const recentMap = buildRecentMap(recent);

  // Empty query: recent first, then alphabetical
  if (trimmed === "") {
    return rankByRecencyThenAlpha(items, recentMap, limit);
  }

  // Score each item against the query
  const scored: Array<{ item: ItemWithCategory; score: number }> = [];
  for (const item of items) {
    const score = scoreItem(trimmed, item, recentMap);
    if (score > 0) {
      scored.push({ item, score });
    }
  }

  scored.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    return a.item.name.localeCompare(b.item.name);
  });

  return scored.slice(0, limit).map((s) => s.item);
}

interface RecentEntry {
  daysAgo: number;
  useCount: number;
}

function buildRecentMap(recent: RecentItemUsage[]): Map<string, RecentEntry> {
  const now = Date.now();
  const map = new Map<string, RecentEntry>();
  for (const r of recent) {
    const lastUsedMs = new Date(r.lastUsedAt).getTime();
    const daysAgo = Math.max(0, (now - lastUsedMs) / (24 * 60 * 60 * 1000));
    map.set(r.itemId, { daysAgo, useCount: r.useCount });
  }
  return map;
}

function rankByRecencyThenAlpha(
  items: ItemWithCategory[],
  recentMap: Map<string, RecentEntry>,
  limit: number,
): ItemWithCategory[] {
  const recents: ItemWithCategory[] = [];
  const others: ItemWithCategory[] = [];

  for (const item of items) {
    if (recentMap.has(item.id)) {
      recents.push(item);
    } else {
      others.push(item);
    }
  }

  // Sort recents by daysAgo ascending (most recent first)
  recents.sort((a, b) => {
    const aAgo = recentMap.get(a.id)!.daysAgo;
    const bAgo = recentMap.get(b.id)!.daysAgo;
    if (aAgo !== bAgo) return aAgo - bAgo;
    return a.name.localeCompare(b.name);
  });

  // Sort others alphabetically
  others.sort((a, b) => a.name.localeCompare(b.name));

  return [...recents, ...others].slice(0, limit);
}

function scoreItem(
  query: string,
  item: ItemWithCategory,
  recentMap: Map<string, RecentEntry>,
): number {
  const name = item.name.toLowerCase();

  // Determine match type
  let baseScore = 0;
  if (name.startsWith(query)) {
    baseScore = 1000;
  } else if (matchesAnyWordPrefix(name, query)) {
    baseScore = 600;
  } else if (name.includes(query)) {
    baseScore = 300;
  } else {
    return 0;
  }

  // Apply recency + frequency boosts
  const usage = recentMap.get(item.id);
  if (usage) {
    // Recency: 200 points for today, decreasing linearly to 0 at 30 days
    const recencyBoost = Math.max(0, 200 - (usage.daysAgo * 200) / 30);
    // Frequency: up to 50 points, capped at 50 uses
    const frequencyBoost = Math.min(50, usage.useCount);
    return baseScore + recencyBoost + frequencyBoost;
  }

  return baseScore;
}

function matchesAnyWordPrefix(name: string, query: string): boolean {
  // Split on whitespace; check if any word starts with the query
  const words = name.split(/\s+/);
  return words.some((word) => word.startsWith(query));
}