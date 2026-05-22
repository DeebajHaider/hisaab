import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { profileKeys } from "./profile-keys";

/**
 * The shape of a profile row. Mirrors public.profiles.
 * `display_name` is null when the user hasn't set one — UI falls back to email.
 */
export interface MyProfile {
  id: string;
  email: string;
  display_name: string | null;
}

/**
 * Fetch the current user's profile row.
 *
 * RLS allows reading your own profile (Phase 4 decision #8). No id arg needed;
 * the RLS policy resolves auth.uid() and that's the row that comes back. We
 * still .eq() on auth.uid() to be explicit about which row we want — it's
 * defence in depth and makes the query's intent obvious.
 */
export function useMyProfile() {
  return useQuery({
    queryKey: profileKeys.me(),
    queryFn: async (): Promise<MyProfile | null> => {
      const { data: userResult } = await supabase.auth.getUser();
      const userId = userResult.user?.id;
      if (!userId) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, display_name")
        .eq("id", userId)
        // maybeSingle, not single — if the profile row hasn't been created
        // yet (the on-signup trigger may have lagged for a freshly-signed-up
        // user), we return null rather than throwing.
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });
}

