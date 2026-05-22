import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { profileKeys } from "./profile-keys";
import { memberKeys } from "./member-keys";

interface UpdateMyProfileInput {
  /**
   * The new display name. Empty string is treated as null (clearing the
   * name → fall back to email). The caller normalises whitespace.
   */
  display_name: string | null;
}

/**
 * Update the current user's display_name.
 *
 * RLS allows updating only your own profile row (Phase 4 decision #8 +
 * the `update own profile` policy from add_profiles_and_member_management).
 * We resolve auth.uid() client-side and target by id explicitly — the
 * policy enforces the rest.
 *
 * Invalidates the member-list cache too, since every member-list row joins
 * to profiles for display names — a name change here should refresh them
 * across every budget the user belongs to.
 */
export function useUpdateMyProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateMyProfileInput) => {
      const { data: userResult } = await supabase.auth.getUser();
      const userId = userResult.user?.id;
      if (!userId) throw new Error("Not signed in.");

      const { error } = await supabase
        .from("profiles")
        .update({ display_name: input.display_name })
        .eq("id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKeys.me() });
      // Member lists across all budgets embed profile display names via the
      // client-side merge in useBudgetMembers. Invalidate the root so any
      // open member list refreshes its display names.
      queryClient.invalidateQueries({ queryKey: memberKeys.all });
    },
  });
}

