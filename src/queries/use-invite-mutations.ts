import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { inviteKeys } from "./invite-keys";

// ---------- Create invite ----------

interface CreateInviteVars {
  budgetId: string;
  role: "editor" | "viewer";
}

export function useCreateInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ budgetId, role }: CreateInviteVars) => {
      // Note: no .select() per the project-wide RLS workaround.
      // We invalidate and refetch instead.
      const { error } = await supabase
        .from("budget_invites")
        .insert({ budget_id: budgetId, role });
      if (error) throw error;
    },
    onSuccess: (_data, { budgetId }) => {
      qc.invalidateQueries({ queryKey: inviteKeys.byBudget(budgetId) });
    },
  });
}

// ---------- Revoke invite ----------

interface RevokeInviteVars {
  inviteId: string;
  budgetId: string;
}

export function useRevokeInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ inviteId }: RevokeInviteVars) => {
      const { error } = await supabase
        .from("budget_invites")
        .delete()
        .eq("id", inviteId);
      if (error) throw error;
    },
    onSuccess: (_data, { budgetId }) => {
      qc.invalidateQueries({ queryKey: inviteKeys.byBudget(budgetId) });
    },
  });
}

// ---------- Accept invite ----------

export function useAcceptInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (token: string): Promise<string> => {
      const { data, error } = await supabase.rpc("accept_invite", {
        invite_token: token,
      });
      if (error) {
        // Surface a clean error message based on the PG exception thrown
        // by the function. The UI matches on these strings.
        if (error.message.includes("not_authenticated")) {
          throw new Error("You must be signed in to accept an invite.");
        }
        if (error.message.includes("invite_not_found")) {
          throw new Error("This invite link is invalid or has been revoked.");
        }
        if (error.message.includes("invite_already_used")) {
          throw new Error("This invite link has already been used.");
        }
        throw new Error(error.message);
      }
      // data is the budget_id returned by the function.
      return data as string;
    },
    onSuccess: () => {
      // We don't know which budget was joined until we've awaited the result,
      // so the caller invalidates targeted keys. We do a broad invalidation
      // of budgets list so the new one appears in the BudgetsHome.
      qc.invalidateQueries({ queryKey: ["budgets"] });
    },
  });
}

