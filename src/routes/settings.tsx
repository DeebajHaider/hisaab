import { useState, useEffect, type FormEvent } from "react";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyProfile } from "@/queries/use-my-profile";
import { useUpdateMyProfile } from "@/queries/use-update-my-profile";

const MAX_DISPLAY_NAME_LENGTH = 80;

export function Settings() {
  const profileQuery = useMyProfile();
  const updateMutation = useUpdateMyProfile();

  // Local form state — initialised from the loaded profile, then user-owned.
  const [displayName, setDisplayName] = useState("");
  const [justSaved, setJustSaved] = useState(false);

  // Initialise the form once the profile loads. After that, the user owns
  // the field — we don't re-sync from the query on every refetch.
  useEffect(() => {
    if (profileQuery.data && !justSaved) {
      setDisplayName(profileQuery.data.display_name ?? "");
    }
    // justSaved guards against a re-sync wiping the user's just-cleared field.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileQuery.data]);

  // Reset the success badge as soon as the user edits the field again.
  useEffect(() => {
    if (justSaved) setJustSaved(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayName]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = displayName.trim();
    // Empty -> null (clear the display name, fall back to email).
    const value = trimmed === "" ? null : trimmed;

    try {
      await updateMutation.mutateAsync({ display_name: value });
      setJustSaved(true);
    } catch {
      // surfaced via updateMutation.error
    }
  };

  // The save button is disabled when nothing changed — avoids redundant writes
  // and gives a clear "is there an edit to save?" affordance.
  const currentSaved = profileQuery.data?.display_name ?? "";
  const trimmedLocal = displayName.trim();
  const isDirty = trimmedLocal !== currentSaved.trim();

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Personal preferences. Apply across every budget you belong to.
        </p>
      </div>

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
            {/* Email is informational, not editable — comes from auth. */}
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

