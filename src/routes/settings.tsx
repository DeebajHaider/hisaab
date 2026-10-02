import { useState, useEffect, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { useMyProfile } from "@/queries/use-my-profile";
import { useUpdateMyProfile } from "@/queries/use-update-my-profile";
import {
  useOwnedSharedBudgets,
  type OwnedSharedBudget,
} from "@/queries/use-owned-shared-budgets";

const MAX_DISPLAY_NAME_LENGTH = 80;

export function Settings() {
  const profileQuery = useMyProfile();
  const updateMutation = useUpdateMyProfile();

  // ── Profile section ────────────────────────────────────────────
  const [displayName, setDisplayName] = useState("");
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => {
    if (profileQuery.data && !justSaved) {
      setDisplayName(profileQuery.data.display_name ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileQuery.data]);

  useEffect(() => {
    if (justSaved) setJustSaved(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayName]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = displayName.trim();
    const value = trimmed === "" ? null : trimmed;
    try {
      await updateMutation.mutateAsync({ display_name: value });
      setJustSaved(true);
    } catch {
      // surfaced via updateMutation.error
    }
  };

  const currentSaved = profileQuery.data?.display_name ?? "";
  const trimmedLocal = displayName.trim();
  const isDirty = trimmedLocal !== currentSaved.trim();

  // ── Security section ───────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordPending, setPasswordPending] = useState(false);

  const clearPasswordError = () => setPasswordError(null);

  const handlePasswordChange = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords don't match.");
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters.");
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordError("New password must be different from the current one.");
      return;
    }

    const email = profileQuery.data?.email;
    if (!email) {
      setPasswordError("Couldn't load your account email. Try refreshing.");
      return;
    }

    setPasswordPending(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });
      if (signInError) {
        setPasswordError("Current password is incorrect.");
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (updateError) throw updateError;

      toast.success("Password updated.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError(
        err instanceof Error ? err.message : "Something went wrong.",
      );
    } finally {
      setPasswordPending(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Personal preferences. Apply across every budget you belong to.
        </p>
      </div>

      {/* ── Profile ──────────────────────────────────────────────── */}
      <section className="rounded-lg border border-border/60 bg-card p-5 sm:p-6">
        <header className="mb-4">
          <h2 className="text-base font-medium">Profile</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Your display name shows up wherever members are listed — leave it
            blank to fall back to your email address.
          </p>
        </header>

        {profileQuery.isLoading ? (
          <ProfileSkeleton />
        ) : !profileQuery.data ? (
          <div className="text-sm text-muted-foreground">
            Couldn't load your profile. Try refreshing the page.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Email</Label>
              <div className="text-sm font-mono">{profileQuery.data.email}</div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="display-name" className="text-xs">
                Display name
              </Label>
              <Input
                id="display-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={MAX_DISPLAY_NAME_LENGTH}
                placeholder="e.g. Deebaj"
                autoComplete="off"
              />
              <div className="text-xs text-muted-foreground">
                {trimmedLocal === ""
                  ? "Blank — members will see your email."
                  : `${trimmedLocal.length}/${MAX_DISPLAY_NAME_LENGTH} characters.`}
              </div>
            </div>

            {updateMutation.error && (
              <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                <div>
                  <div className="font-medium text-destructive">
                    Couldn't save
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {updateMutation.error instanceof Error
                      ? updateMutation.error.message
                      : "Unknown error"}
                  </div>
                </div>
              </div>
            )}

            {justSaved && !updateMutation.isPending && (
              <div className="rounded-md border border-accent-highlight-border bg-accent-highlight p-3 text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-accent-text" />
                <span>Saved.</span>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-border/40">
              <Button
                type="submit"
                disabled={!isDirty || updateMutation.isPending}
                className="bg-accent-solid hover:bg-accent-solid-hover text-white"
              >
                {updateMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save changes"
                )}
              </Button>
            </div>
          </form>
        )}
      </section>

      {/* ── Security ─────────────────────────────────────────────── */}
      <section className="rounded-lg border border-border/60 bg-card p-5 sm:p-6">
        <header className="mb-4">
          <h2 className="text-base font-medium">Security</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Change the password you use to sign in.
          </p>
        </header>

        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="current-password" className="text-xs">
              Current password
            </Label>
            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => {
                setCurrentPassword(e.target.value);
                clearPasswordError();
              }}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="new-password" className="text-xs">
              New password
            </Label>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                clearPasswordError();
              }}
              required
              minLength={6}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm-password" className="text-xs">
              Confirm new password
            </Label>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                clearPasswordError();
              }}
              required
              minLength={6}
            />
          </div>

          {passwordError && (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
              <div>
                <div className="font-medium text-destructive">
                  Couldn't update password
                </div>
                <div className="text-xs text-muted-foreground">
                  {passwordError}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-2 border-t border-border/40">
            <Button
              type="submit"
              disabled={
                passwordPending ||
                !currentPassword ||
                !newPassword ||
                !confirmPassword ||
                profileQuery.isLoading
              }
              className="bg-accent-solid hover:bg-accent-solid-hover text-white"
            >
              {passwordPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update password"
              )}
            </Button>
          </div>
        </form>
      </section>

      {/* ── Sessions ─────────────────────────────────────────────── */}
      <SessionsSection />

      {/* ── Danger zone ──────────────────────────────────────────── */}
      <DangerZone email={profileQuery.data?.email ?? null} />
    </div>
  );
}

// ─── Sessions ─────────────────────────────────────────────────────────────────

function SessionsSection() {
  const navigate = useNavigate();
  const [pending, setPending] = useState(false);

  const handleSignOutAll = async () => {
    setPending(true);
    try {
      // scope: 'global' revokes all refresh tokens for this user,
      // invalidating every active session including the current one.
      await supabase.auth.signOut({ scope: "global" });
      navigate("/auth", { replace: true });
    } catch (err) {
      toast.error("Couldn't sign out.", {
        description: err instanceof Error ? err.message : "Unknown error.",
        duration: 6000,
      });
      setPending(false);
    }
  };

  return (
    <section className="rounded-lg border border-border/60 bg-card p-5 sm:p-6">
      <header className="mb-4">
        <h2 className="text-base font-medium">Sessions</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Revoke access on all devices, including this one. Sign back in on
          any device you want to keep using.
        </p>
      </header>
      <Button
        variant="outline"
        onClick={handleSignOutAll}
        disabled={pending}
      >
        {pending ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Signing out...
          </>
        ) : (
          "Sign out of all devices"
        )}
      </Button>
    </section>
  );
}

// ─── Danger zone ──────────────────────────────────────────────────────────────

function DangerZone({ email }: { email: string | null }) {
  const navigate = useNavigate();
  const sharedBudgetsQuery = useOwnedSharedBudgets();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const hasSharedBudgets = (sharedBudgetsQuery.data?.length ?? 0) > 0;
  const emailMatches =
    !!email &&
    confirmEmail.trim().toLowerCase() === email.toLowerCase();

  const closeDialog = () => {
    setDialogOpen(false);
    setConfirmEmail("");
    setDeleteError(null);
  };

  const handleDelete = async () => {
    setDeleteError(null);
    setDeleting(true);
    try {
      const { error } = await supabase.rpc("delete_own_account");
      if (error) throw error;
      await supabase.auth.signOut().catch(() => {});
      navigate("/", { replace: true });
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Something went wrong.",
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section className="rounded-lg border border-destructive/30 bg-card p-5 sm:p-6">
      <header className="mb-4">
        <h2 className="text-base font-medium text-destructive">Danger zone</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Permanent actions that cannot be undone.
        </p>
      </header>

      {sharedBudgetsQuery.isLoading ? (
        <Skeleton className="h-9 w-36" />
      ) : hasSharedBudgets ? (
        <BlockedDeletion budgets={sharedBudgetsQuery.data!} />
      ) : (
        <Button
          variant="outline"
          className="border-destructive/50 text-destructive hover:bg-destructive/5 hover:text-destructive"
          onClick={() => setDialogOpen(true)}
        >
          Delete account
        </Button>
      )}

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) closeDialog();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete your account</DialogTitle>
            <DialogDescription>
              This permanently removes your account and everything you own.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm">
            <ul className="space-y-1 text-muted-foreground list-disc list-inside">
              <li>Your account and sign-in credentials</li>
              <li>All portfolios, holdings, and their full history</li>
              <li>
                All budgets you own, including every transaction, income
                entry, savings entry, category, and item within them
              </li>
            </ul>
            <p className="text-xs text-muted-foreground">
              Transactions you logged in budgets owned by others will remain
              but will no longer show your name.
            </p>
            <p className="font-medium">This cannot be undone.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm-delete-email" className="text-xs">
              Type your email address to confirm
            </Label>
            <Input
              id="confirm-delete-email"
              type="email"
              value={confirmEmail}
              onChange={(e) => {
                setConfirmEmail(e.target.value);
                setDeleteError(null);
              }}
              placeholder={email ?? "your@email.com"}
              autoComplete="off"
            />
          </div>

          {deleteError && (
            <p className="text-sm text-destructive" role="alert">
              {deleteError}
            </p>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={closeDialog}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={!emailMatches || deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete account"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function BlockedDeletion({ budgets }: { budgets: OwnedSharedBudget[] }) {
  return (
    <div className="space-y-3">
      <div className="rounded-md border border-amber-200 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/20 p-3">
        <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
          Transfer ownership before deleting
        </p>
        <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
          You own{" "}
          {budgets.length === 1
            ? "a shared budget"
            : `${budgets.length} shared budgets`}{" "}
          with other members. Transfer ownership to another member in each
          budget first.
        </p>
      </div>
      <ul className="space-y-1.5">
        {budgets.map((b) => (
          <li key={b.budget_id}>
            <Link
              to={`/app/budgets/${b.budget_id}/members`}
              className="text-sm text-accent-text hover:underline underline-offset-2"
            >
              {b.budget_name} → Members
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Skeletons ────────────────────────────────────────────────────────────────

function ProfileSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-9 w-32 ml-auto" />
    </div>
  );
}