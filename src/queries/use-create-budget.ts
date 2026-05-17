import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";

interface CreateBudgetInput {
  name: string;
  currency?: string;
  isShared?: boolean;
}

/**
 * Create a new budget. The DB defaults `created_by` to auth.uid() and a
 * trigger adds the creator as 'owner' in budget_members.
 *
 * Note: we don't .select() the inserted row. The SELECT policy on budgets
 * calls is_budget_member(), which evaluates membership in the same statement
 * the trigger just wrote — and there's an RLS-evaluation order issue that
 * isn't fully untangled. Returning void and invalidating the list query
 * works fine for this case.
 */
export function useCreateBudget() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateBudgetInput): Promise<void> => {
  if (!user) {
    throw new Error("Must be signed in to create a budget");
  }

  // DEBUG: check what supabase-js thinks the auth state is
  const { data: { session } } = await supabase.auth.getSession();
  console.log("React auth user.id:", user.id);
  console.log("Supabase session user.id:", session?.user?.id);
  console.log("Are they equal?", user.id === session?.user?.id);

  const { error } = await supabase
    .from("budgets")
    .insert({
      name: input.name,
      currency: input.currency ?? "PKR",
      is_shared: input.isShared ?? false
    })

  if (error) throw error;
},

    // After a successful create, invalidate the budgets query so the list refreshes.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
    },
  });
}