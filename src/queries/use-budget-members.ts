import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { memberKeys } from "./member-keys";

// Member row joined with profile info for display.
// We fetch members and their profiles in two queries and merge
// client-side because Supabase's embed-based joining requires a
// foreign-key relationship between the two tables, and budget_members
// has its FK on user_id pointing at auth.users (not public.profiles).
export interface BudgetMemberWithProfile {
  user_id: string;
  budget_id: string;
  role: "owner" | "editor" | "viewer";
  email: string;
  display_name: string | null;
}

export function useBudgetMembers(budgetId: string | undefined) {
  return useQuery({
    queryKey: budgetId ? memberKeys.byBudget(budgetId) : ["members", "none"],
    queryFn: async (): Promise<BudgetMemberWithProfile[]> => {
      if (!budgetId) return [];

      // Step 1: get the raw membership rows for this budget.
    // No created_at column on budget_members — we order by user_id for
    // stable display order.
    const { data: members, error: membersError } = await supabase
    .from("budget_members")
    .select("user_id, budget_id, role")
    .eq("budget_id", budgetId)
    .order("user_id", { ascending: true });

      if (membersError) throw membersError;
      if (!members || members.length === 0) return [];

      // Step 2: get profiles for the user_ids we just fetched.
      // RLS on profiles enforces that the caller can only read profiles
      // of users they share a budget with, which is everyone in this
      // member list by construction.
      const userIds = members.map((m) => m.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email, display_name")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      // Step 3: merge. Index profiles by id for O(1) lookup.
      const profileById = new Map(
        (profiles ?? []).map((p) => [p.id, p]),
      );

      return members.map((m) => {
        const profile = profileById.get(m.user_id);
        return {
          user_id: m.user_id,
          budget_id: m.budget_id,
          role: m.role as "owner" | "editor" | "viewer",
          // Fallbacks in case a profile is somehow missing (e.g. a
          // freshly-created user whose trigger hasn't completed yet).
          email: profile?.email ?? "Unknown user",
          display_name: profile?.display_name ?? null,
        };
      });
    },
    enabled: !!budgetId,
  });
}
