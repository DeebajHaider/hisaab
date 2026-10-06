import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { claimResume, readLastPath, resolveResumePath, saveLastPath } from "@/lib/resume-path";

/** Remembers the last budget/portfolio page visited. Renders nothing. */
export function LastPageTracker() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const userId = user?.id;

  useEffect(() => {
    if (userId) saveLastPath(userId, pathname);
  }, [userId, pathname]);

  return null;
}

/** Rendered at the app home: on launch, jumps back to where the user left off. */
export function ResumeLastPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const userId = user?.id;

  useEffect(() => {
    if (!userId || !claimResume()) return;
    const target = resolveResumePath(readLastPath(userId));
    if (target) navigate(target, { replace: true });
  }, [userId, navigate]);

  return null;
}
