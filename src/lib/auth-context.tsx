import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { clearPendingInvite } from "@/lib/pending-invite";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    // 1) Navigate to landing FIRST. This unmounts RequireAuth, so when the
    //    session goes null moments later, there's nothing watching the user
    //    that would bounce us to /auth.
    navigate("/", { replace: true });

    // 2) Clear pending invite token. If the user was mid-flow on an invite
    //    and decided to sign out instead, the stale token shouldn't attach
    //    to whoever signs in next.
    clearPendingInvite();

    // 3) Sign out of Supabase. This triggers onAuthStateChange, which nulls
    //    out session. We've already navigated away, so this is just teardown.
    await supabase.auth.signOut();

    // 4) Clear the TanStack Query cache. Without this, user B signing in on
    //    the same tab would briefly see user A's cached budgets and
    //    transactions before refetches complete. queryClient.clear() drops
    //    all query state — every subsequent query starts fresh.
    //    Called last because earlier steps don't depend on cache state.
    queryClient.clear();
  };

  const value: AuthContextValue = {
    user: session?.user ?? null,
    session,
    loading,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

