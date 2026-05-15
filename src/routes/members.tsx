import { useParams } from "react-router-dom";
import { useBudgetInvites } from "@/queries/use-budget-invites";
import { useRevokeInvite } from "@/queries/use-invite-mutations";
import { InviteLinkDialog } from "@/components/members/invite-link-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Trash2 } from "lucide-react";

export function Members() {
  const { budgetId } = useParams<{ budgetId: string }>();
  const invitesQuery = useBudgetInvites(budgetId);
  const revokeMutation = useRevokeInvite();

  if (!budgetId) return null;

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Members</h1>
          <p className="text-sm text-muted-foreground">
            Manage who has access to this budget. Full member list arrives
            in the next step; this view shows pending invite links.
          </p>
        </div>
        <InviteLinkDialog budgetId={budgetId} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pending invites</CardTitle>
        </CardHeader>
        <CardContent>
          {invitesQuery.isPending ? (
            <Skeleton className="h-16 w-full" />
          ) : invitesQuery.data && invitesQuery.data.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {invitesQuery.data.map((invite) => {
                const url = `${window.location.origin}/invite/${invite.token}`;
                return (
                  <li
                    key={invite.id}
                    className="flex items-center justify-between gap-3 rounded-md border border-border p-3"
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-medium">
                        {invite.role}
                      </span>
                      <span className="text-xs text-muted-foreground truncate">
                        {url}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        revokeMutation.mutate({
                          inviteId: invite.id,
                          budgetId,
                        })
                      }
                      disabled={revokeMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                      Revoke
                    </Button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No pending invites. Generate one above.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

