import { Navigate, useLocation } from "react-router-dom";
import { type ReactNode } from "react";
import { useAuth } from "@/lib/auth-context";

interface RequireAuthProps {
  children: ReactNode;
}

/**
 * Route guard: renders children only if the user is authenticated.
 * Otherwise redirects to /auth, preserving the attempted URL so we
 * can return there after login.
 */
export function RequireAuth({ children }: RequireAuthProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Auth state is still being determined — show nothing rather than
  // flashing the login redirect for users who actually are logged in.
  if (loading) {
    return null;
  }

  // Not logged in — redirect, but remember where they tried to go.
  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}