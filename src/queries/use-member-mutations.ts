import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { memberKeys } from "./member-keys";
import { toast } from "sonner";


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
      toast.success("Role updated.");
      qc.invalidateQueries({ queryKey: memberKeys.byBudget(budgetId) });
    },
    onError: (error) => {
      toast.error("Couldn't update role.", {
        description: error instanceof Error ? error.message : "Unknown error.",
        duration: 6000,
      });
    },
  });
}


// ---------- Transfer ownership ----------
// Calls the transfer_budget_ownership RPC, which atomically promotes the
// target member to owner and demotes the current owner to editor.
// Both changes happen in one transaction — either both land or neither do.

interface TransferOwnershipVars {
  budgetId: string;
  newOwnerId: string;
}

export function useTransferOwnership() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ budgetId, newOwnerId }: TransferOwnershipVars) => {
      const { error } = await supabase.rpc("transfer_budget_ownership", {
        p_budget_id:    budgetId,
        p_new_owner_id: newOwnerId,
      });
      if (error) throw error;
    },
    onSuccess: (_data, { budgetId }) => {
      toast.success("Ownership transferred.");
      qc.invalidateQueries({ queryKey: memberKeys.byBudget(budgetId) });
      // Invalidate budgets list — the current user is no longer owner,
      // which affects what they can do in other parts of the app.
      qc.invalidateQueries({ queryKey: ["budgets"] });
    },
    onError: (error) => {
      toast.error("Couldn't transfer ownership.", {
        description: error instanceof Error ? error.message : "Unknown error.",
        duration: 6000,
      });
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
            "Cannot remove the last owner of a budget. Transfer ownership " +
              "to another member first, or delete the budget instead.",
          );
        }
        throw error;
      }
    },
    onSuccess: (_data, { budgetId }) => {
      qc.invalidateQueries({ queryKey: memberKeys.byBudget(budgetId) });
      qc.invalidateQueries({ queryKey: ["budgets"] });
    },
    onError: (error) => {
      toast.error("Couldn't remove member.", {
        description: error instanceof Error ? error.message : "Unknown error.",
        duration: 6000,
      });
    },
  });
}