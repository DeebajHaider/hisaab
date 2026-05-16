import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { memberKeys } from "./member-keys";

// ---------- Change role ----------

interface UpdateMemberRoleVars {
  budgetId: string;
  userId: string;
  role: "editor" | "viewer";
}

export function useUpdateMemberRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ budgetId, userId, role }: UpdateMemberRoleVars) => {
      const { error } = await supabase
        .from("budget_members")
        .update({ role })
        .eq("budget_id", budgetId)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: (_data, { budgetId }) => {
      qc.invalidateQueries({ queryKey: memberKeys.byBudget(budgetId) });
    },
  });
}

// ---------- Remove / leave ----------
// The DB doesn't distinguish: removing someone else and leaving yourself
// are both DELETEs on the same row. RLS gates which one you're allowed
// to do (owner → remove anyone; member → only your own row).

interface RemoveMemberVars {
  budgetId: string;
  userId: string;
}

export function useRemoveMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ budgetId, userId }: RemoveMemberVars) => {
      const { error } = await supabase
        .from("budget_members")
        .delete()
        .eq("budget_id", budgetId)
        .eq("user_id", userId);
      if (error) {
        // The prevent_last_owner_removal trigger raises this if someone
        // tries to delete the last owner. Surface a clean message.
        if (error.message.includes("cannot_remove_last_owner")) {
          throw new Error(
            "Cannot remove the last owner of a budget. Promote another " +
              "member to owner first, or delete the budget instead.",
          );
        }
        throw error;
      }
    },
    onSuccess: (_data, { budgetId }) => {
      qc.invalidateQueries({ queryKey: memberKeys.byBudget(budgetId) });
      // If the current user just left the budget, the budgets list
      // changes too. Broad invalidation handles both cases.
      qc.invalidateQueries({ queryKey: ["budgets"] });
    },
  });
}