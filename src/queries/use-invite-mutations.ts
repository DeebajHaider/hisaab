import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { inviteKeys } from "./invite-keys";
import { toast } from "sonner";


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
      toast.success("Invite created.");
      qc.invalidateQueries({ queryKey: inviteKeys.byBudget(budgetId) });
    },
    onError: (error, _variables) => {
      // Errors deserve longer than the 4s default — give the user time to read.
      toast.error("Couldn't create Invite", {
        description: error instanceof Error ? error.message : "Unknown error.",
        duration: 6000,
      });
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
      toast.success("Invite revoked.");
      qc.invalidateQueries({ queryKey: inviteKeys.byBudget(budgetId) });
    },
    onError: (error, _variables) => {
      // Errors deserve longer than the 4s default — give the user time to read.
      toast.error("Couldn't revoke invite.", {
        description: error instanceof Error ? error.message : "Unknown error.",
        duration: 6000,
      });
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
      toast.success("Invite accepted.");
      // We don't know which budget was joined until we've awaited the result,
      // so the caller invalidates targeted keys. We do a broad invalidation
      // of budgets list so the new one appears in the BudgetsHome.
      qc.invalidateQueries({ queryKey: ["budgets"] });
    },
    onError: (error, _variables) => {
      // Errors deserve longer than the 4s default — give the user time to read.
      toast.error("Couldn't accept invite", {
        description: error instanceof Error ? error.message : "Unknown error.",
        duration: 6000,
      });
    },
  });
}

