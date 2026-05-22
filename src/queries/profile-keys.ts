/**
 * Cache key factory for the current user's profile (and, by future extension,
 * other profile reads). Follows the established factory convention so
 * invalidations cascade correctly via prefix matching.
 *
 * Hierarchy:
 *   ['profile']                    -> all profile queries (cache root)
 *   ['profile', 'me']              -> the current user's profile
 *
 * Per-user-by-id keys can be added here later if a "view another member's
 * profile" use case appears; for now only the self-read exists.
 */
export const profileKeys = {
  all: ["profile"] as const,
  me: () => [...profileKeys.all, "me"] as const,
};

