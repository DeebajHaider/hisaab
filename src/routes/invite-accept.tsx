import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { useInviteLookup } from "@/queries/use-invite-lookup";
import { useAcceptInvite } from "@/queries/use-invite-mutations";
import {
  setPendingInvite,
  clearPendingInvite,
} from "@/lib/pending-invite";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function InviteAccept() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const lookup = useInviteLookup(token);
  const acceptMutation = useAcceptInvite();

  // If not signed in: stash the token and bounce to /auth.
  // We do this in an effect (not during render) so React-Router transitions
  // happen cleanly and we don't double-render the lookup query in a
  // soon-to-unmount component.
  useEffect(() => {
    if (authLoading) return;
    if (!user && token) {
      setPendingInvite(token);
      navigate("/auth", { replace: true });
    }
  }, [authLoading, user, token, navigate]);

  // Render guards. Order matters — bail early so we don't show the
  // accept UI to a signed-out user mid-redirect.
  if (authLoading || !token) {
    return <CenteredSkeleton />;
  }
  if (!user) {
    // Effect above is handling the redirect; render a placeholder.
    return <CenteredSkeleton />;
  }

  if (lookup.isPending) {
    return <CenteredSkeleton />;
  }

  // Lookup completed but returned null → invalid token.
  if (!lookup.data) {
    return (
      <CenteredCard>
        <CardHeader>
          <CardTitle>Invalid invite link</CardTitle>
          <CardDescription>
            This link is invalid or has been revoked. Ask the budget owner
            for a fresh one.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button
            variant="secondary"
            onClick={() => {
              clearPendingInvite();
              navigate("/app", { replace: true });
            }}
          >
            Go to your budgets
          </Button>
        </CardFooter>
      </CenteredCard>
    );
  }

  // Already consumed by someone else.
  if (lookup.data.accepted_at && !lookup.data.already_member) {
    return (
      <CenteredCard>
        <CardHeader>
          <CardTitle>Link already used</CardTitle>
          <CardDescription>
            This invite has already been accepted. Ask the budget owner
            for a fresh link if you still need access.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button
            onClick={() => {
              clearPendingInvite();
              navigate("/app", { replace: true });
            }}
          >
            Go to your budgets
          </Button>
        </CardFooter>
      </CenteredCard>
    );
  }

  // User is already a member of this budget.
  // accept_invite still returns the budget_id without consuming the link.
  // We jump them straight in.
  if (lookup.data.already_member) {
    return (
      <CenteredCard>
        <CardHeader>
          <CardTitle>You're already in this budget</CardTitle>
          <CardDescription>
            You're a member of "{lookup.data.budget_name}". Hop in.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button
            onClick={() => {
              clearPendingInvite();
              navigate(`/app/budgets/${lookup.data!.budget_id}`, {
                replace: true,
              });
            }}
          >
            Open budget
          </Button>
        </CardFooter>
      </CenteredCard>
    );
  }

  // Normal acceptance path.
  const handleAccept = async () => {
    try {
      const budgetId = await acceptMutation.mutateAsync(token);
      clearPendingInvite();
      navigate(`/app/budgets/${budgetId}`, { replace: true });
    } catch {
      // Error state rendered by the mutation; nothing to do here.
    }
  };

  const handleDecline = () => {
    clearPendingInvite();
    navigate("/app", { replace: true });
  };

  return (
    <CenteredCard>
      <CardHeader>
        <CardTitle>Join "{lookup.data.budget_name}"</CardTitle>
        <CardDescription>
          You've been invited to join this budget as{" "}
          <span className="font-medium">{lookup.data.role}</span>.
        </CardDescription>
      </CardHeader>
      {acceptMutation.isError && (
        <CardContent>
          <p className="text-sm text-destructive" role="alert">
            {acceptMutation.error instanceof Error
              ? acceptMutation.error.message
              : "Could not accept invite."}
          </p>
        </CardContent>
      )}
      <CardFooter className="flex gap-2">
        <Button
          onClick={handleAccept}
          disabled={acceptMutation.isPending}
          className="flex-1"
        >
          {acceptMutation.isPending ? "Joining..." : "Accept invite"}
        </Button>
        <Button
          variant="secondary"
          onClick={handleDecline}
          disabled={acceptMutation.isPending}
        >
          Not now
        </Button>
      </CardFooter>
    </CenteredCard>
  );
}

// Small layout primitives kept local because nothing else needs them.
function CenteredCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">{children}</Card>
    </div>
  );
}

function CenteredSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardFooter>
          <Skeleton className="h-10 w-full" />
        </CardFooter>
      </Card>
    </div>
  );
}
