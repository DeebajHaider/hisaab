import { useState, useEffect, type FormEvent } from "react";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";
import { useMyProfile } from "@/queries/use-my-profile";
import { useUpdateMyProfile } from "@/queries/use-update-my-profile";

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
      // Verify the current password before updating. signInWithPassword
      // returns an error if the credentials are wrong without changing
      // anything — safe to call during an active session.
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
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
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
              <div className="rounded-md border border-teal-200 dark:border-teal-900/60 bg-teal-50 dark:bg-teal-950/30 p-3 text-sm flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span>Saved.</span>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-border/40">
              <Button
                type="submit"
                disabled={!isDirty || updateMutation.isPending}
                className="bg-teal-600 hover:bg-teal-700 text-white"
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
              className="bg-teal-600 hover:bg-teal-700 text-white"
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
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-9 w-32 ml-auto" />
    </div>
  );
}
