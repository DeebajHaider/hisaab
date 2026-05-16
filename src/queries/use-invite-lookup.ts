import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { inviteKeys } from "./invite-keys";

// Previews an invite by token. Returns null for unknown/invalid tokens.
// The function is security-definer so this works without budget membership.
export interface InvitePreview {
  budget_id: string;
  budget_name: string;
  role: "editor" | "viewer";
  accepted_at: string | null;
  already_member: boolean;
}

export function useInviteLookup(token: string | undefined) {
  return useQuery({
    queryKey: token ? inviteKeys.byToken(token) : ["invites", "no-token"],
    queryFn: async (): Promise<InvitePreview | null> => {
      if (!token) return null;
      const { data, error } = await supabase
        .rpc("lookup_invite", { invite_token: token })
        .single();
      // If the function returns no rows, supabase reports an error with
      // code PGRST116. Treat that as "not found" rather than throwing.
      if (error) {
        if (error.code === "PGRST116") return null;
        throw error;
      }
      return data as InvitePreview;
    },
    enabled: !!token,
    // Don't cache invite lookups for long — state can change quickly
    // (owner revokes, someone else accepts).
    staleTime: 0,
    retry: false,
  });
}

