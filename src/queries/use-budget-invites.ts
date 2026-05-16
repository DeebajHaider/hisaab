import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { inviteKeys } from "./invite-keys";

// Lists all pending (not-yet-accepted) invites for a budget.
// RLS restricts this to budget owners — the query returns an empty array
// for non-owners. The UI shows the "Invite" UI conditionally on role.
export interface BudgetInvite {
  id: string;
  budget_id: string;
  role: "editor" | "viewer";
  token: string;
  invited_by: string;
  created_at: string;
  accepted_at: string | null;
}

export function useBudgetInvites(budgetId: string | undefined) {
  return useQuery({
    queryKey: budgetId ? inviteKeys.byBudget(budgetId) : ["invites", "none"],
    queryFn: async (): Promise<BudgetInvite[]> => {
      if (!budgetId) return [];
      const { data, error } = await supabase
        .from("budget_invites")
        .select("*")
        .eq("budget_id", budgetId)
        // Show pending first — newest first within that.
        .is("accepted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!budgetId,
  });
}

