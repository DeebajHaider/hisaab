import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";

export type OwnedSharedBudget = {
  budget_id: string;
  budget_name: string;
};

/**
 * Returns budgets where the current user is owner AND at least one
 * other member exists. Used by the account-deletion pre-flight check
 * to decide whether to show the blocker or the confirmation dialog.
 *
 * Invalidated whenever ["budgets"] is invalidated — so a successful
 * ownership transfer on the Members page automatically unblocks deletion
 * on the next visit to Settings without a manual refresh.
 */
export function useOwnedSharedBudgets() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["budgets", "owned-shared", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<OwnedSharedBudget[]> => {
      const { data, error } = await supabase.rpc("get_owned_shared_budgets");
      if (error) throw error;
      return (data ?? []) as OwnedSharedBudget[];
    },
  });
}