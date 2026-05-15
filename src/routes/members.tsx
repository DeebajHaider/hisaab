import { useParams , useNavigate} from "react-router-dom";
import { Trash2, LogOut } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useBudget } from "@/queries/use-budget";
import {
  useBudgetMembers,
  type BudgetMemberWithProfile,
} from "@/queries/use-budget-members";
import {
  useUpdateMemberRole,
  useRemoveMember,
} from "@/queries/use-member-mutations";
import { useBudgetInvites } from "@/queries/use-budget-invites";
import { useRevokeInvite } from "@/queries/use-invite-mutations";
import { InviteLinkDialog } from "@/components/members/invite-link-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getInitials } from "@/lib/format/initials";

export function Members() {
  const { budgetId } = useParams<{ budgetId: string }>();
  const { user } = useAuth();
  const budgetQuery = useBudget(budgetId);
  const membersQuery = useBudgetMembers(budgetId);

  if (!budgetId || !user) return null;

  // Find the current user's row to know if they're an owner.
  // Drives most of the conditional rendering on this page.
  const currentMember = membersQuery.data?.find(
    (m) => m.user_id === user.id,
  );
  const isOwner = currentMember?.role === "owner";

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-3xl">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Members</h1>
          <p className="text-sm text-muted-foreground">
            People with access to{" "}
            <span className="font-medium">{budgetQuery.data?.name}</span>.
          </p>
        </div>
        {/* Only owners can invite. Non-owners don't see this button at all. */}
        {isOwner && <InviteLinkDialog budgetId={budgetId} />}
      </div>

      <MemberList
        budgetId={budgetId}
        members={membersQuery.data}
        isLoading={membersQuery.isPending}
        currentUserId={user.id}
        currentUserIsOwner={isOwner}
      />

      {/* Pending invites — only owners see this section, since RLS
          restricts SELECT on budget_invites to owners anyway. */}
      {isOwner && <PendingInvitesCard budgetId={budgetId} />}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Member list — one card listing all members with role + action affordances
// ----------------------------------------------------------------------------
function MemberList({
  budgetId,
  members,
  isLoading,
  currentUserId,
  currentUserIsOwner,
}: {
  budgetId: string;
  members: BudgetMemberWithProfile[] | undefined;
  isLoading: boolean;
  currentUserId: string;
  currentUserIsOwner: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Current members</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : !members || members.length === 0 ? (
          <p className="text-sm text-muted-foreground">No members yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {members.map((m) => (
              <MemberRow
                key={m.user_id}
                budgetId={budgetId}
                member={m}
                isSelf={m.user_id === currentUserId}
                viewerIsOwner={currentUserIsOwner}
              />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// ----------------------------------------------------------------------------
// Single member row — avatar, email, role badge / picker, action buttons
// ----------------------------------------------------------------------------
function MemberRow({
  budgetId,
  member,
  isSelf,
  viewerIsOwner,
}: {
  budgetId: string;
  member: BudgetMemberWithProfile;
  isSelf: boolean;
  viewerIsOwner: boolean;
}) {
  const navigate = useNavigate();
  const updateRole = useUpdateMemberRole();
  const removeMember = useRemoveMember();
  const [confirmRemove, setConfirmRemove] = useState(false);

  // Owner role is immutable in the UI per Phase 4 decision: only the
  // creator stays owner, no promotion or demotion. Role picker only
  // shows for editor/viewer rows when the viewer is an owner.
  const canChangeRole =
    viewerIsOwner && member.role !== "owner" && !isSelf;

  // Removal rules:
  //   - Owners can remove anyone except themselves (last-owner rule)
  //   - Anyone can remove themselves (the "leave" path)
  //   - Self-leave is blocked for owners by the same last-owner rule
  const canRemoveOther = viewerIsOwner && !isSelf && member.role !== "owner";
  const canLeave = isSelf && member.role !== "owner";

  const handleRoleChange = async (newRole: "editor" | "viewer") => {
    await updateRole.mutateAsync({
      budgetId,
      userId: member.user_id,
      role: newRole,
    });
  };

  const handleRemove = async () => {
    try {
      await removeMember.mutateAsync({
        budgetId,
        userId: member.user_id,
      });
      setConfirmRemove(false);
      // If the current user just left the budget, they no longer have
      // access. Navigate to /app before the page re-renders with empty
      // member data (which would look like a broken state).
      if (isSelf) {
        navigate("/app", { replace: true });
      }
    } catch {
      // Error rendered in the alert dialog below.
    }
  };

  const initial = getInitials({
    displayName: member.display_name,
    email: member.email,
  });
  const displayName = member.display_name ?? member.email;

  return (
    <li className="flex items-center gap-3 py-3">
      <Avatar className="w-9 h-9 shrink-0">
        <AvatarFallback className="bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 text-sm font-medium">
          {initial}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium truncate">{displayName}</span>
          {isSelf && (
            <span className="text-xs text-muted-foreground">(you)</span>
          )}
        </div>
        {member.display_name && (
          <span className="text-xs text-muted-foreground truncate block">
            {member.email}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {/* Role: editable select for owners changing others, static badge otherwise */}
        {canChangeRole ? (
          <Select
            value={member.role}
            onValueChange={(v) => handleRoleChange(v as "editor" | "viewer")}
            disabled={updateRole.isPending}
          >
            <SelectTrigger className="w-28 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="editor">Editor</SelectItem>
              <SelectItem value="viewer">Viewer</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <RoleBadge role={member.role} />
        )}

        {/* Remove / leave button */}
        {(canRemoveOther || canLeave) && (
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={() => setConfirmRemove(true)}
            disabled={removeMember.isPending}
            aria-label={canLeave ? "Leave budget" : "Remove member"}
            title={canLeave ? "Leave budget" : "Remove member"}
          >
            {canLeave ? (
              <LogOut className="h-4 w-4" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>

      <AlertDialog open={confirmRemove} onOpenChange={setConfirmRemove}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {canLeave ? "Leave this budget?" : `Remove ${displayName}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {canLeave
                ? "You'll lose access to this budget's transactions, categories, and history. The owner would need to re-invite you to rejoin."
                : "They'll lose access to this budget immediately. Transactions they logged will stay in the budget."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {removeMember.isError && (
            <p className="text-sm text-destructive" role="alert">
              {removeMember.error instanceof Error
                ? removeMember.error.message
                : "Could not complete action."}
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeMember.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              disabled={removeMember.isPending}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {removeMember.isPending
                ? "Working..."
                : canLeave
                  ? "Leave budget"
                  : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}

function RoleBadge({ role }: { role: "owner" | "editor" | "viewer" }) {
  // Owner uses the teal accent to match the brand. Editor/viewer are neutral
  // since they're the common case and don't need visual emphasis.
  if (role === "owner") {
    return (
      <Badge className="bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/40">
        Owner
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="capitalize">
      {role}
    </Badge>
  );
}

// ----------------------------------------------------------------------------
// Pending invites card — owners only
// ----------------------------------------------------------------------------
function PendingInvitesCard({ budgetId }: { budgetId: string }) {
  const invitesQuery = useBudgetInvites(budgetId);
  const revokeMutation = useRevokeInvite();

  // Hide the card entirely when there are no pending invites and we're
  // not loading. The Invite button at the top is the affordance to add
  // one; no need for an empty-state card to scream "no pending invites".
  if (
    !invitesQuery.isPending &&
    (!invitesQuery.data || invitesQuery.data.length === 0)
  ) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Pending invites</CardTitle>
      </CardHeader>
      <CardContent>
        {invitesQuery.isPending ? (
          <Skeleton className="h-12 w-full" />
        ) : (
          <ul className="flex flex-col gap-2">
            {invitesQuery.data!.map((invite) => {
              const url = `${window.location.origin}/invite/${invite.token}`;
              return (
                <li
                  key={invite.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-border p-3"
                >
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-medium capitalize">
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
        )}
      </CardContent>
    </Card>
  );
}

