import { useState } from "react";
import { Check, Copy, Link2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateInvite } from "@/queries/use-invite-mutations";
import { useBudgetInvites } from "@/queries/use-budget-invites";

interface InviteLinkDialogProps {
  budgetId: string;
  trigger?: React.ReactNode;
}

export function InviteLinkDialog({ budgetId, trigger }: InviteLinkDialogProps) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<"editor" | "viewer">("editor");
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const createMutation = useCreateInvite();
  const invitesQuery = useBudgetInvites(budgetId);

  const handleGenerate = async () => {
    await createMutation.mutateAsync({ budgetId, role });
    // After invalidation, the most recent invite is at the top of the list.
    // We refetch and read the first one to get its token. This is the
    // workaround for "mutations don't .select()" — we read it back from
    // the invalidated query.
    const refetched = await invitesQuery.refetch();
    const newest = refetched.data?.[0];
    if (newest) setGeneratedToken(newest.token);
  };

  // Reset state when the dialog closes so the next open starts fresh.
  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setGeneratedToken(null);
      setCopied(false);
      setRole("editor");
    }
  };

  const inviteUrl = generatedToken
    ? `${window.location.origin}/invite/${generatedToken}`
    : "";

  const handleCopy = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      // Brief visual confirmation before reverting.
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can fail in non-HTTPS contexts. Fallback: select
      // the input so the user can copy manually.
      const input = document.getElementById(
        "invite-link-input",
      ) as HTMLInputElement | null;
      input?.select();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Link2 className="h-4 w-4" />
            Invite member
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a member</DialogTitle>
          <DialogDescription>
            {generatedToken
              ? "Share this link with whoever should join. The link works once."
              : "Pick a role and generate a one-time link to share."}
          </DialogDescription>
        </DialogHeader>

        {!generatedToken ? (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="role-select">Role</Label>
              <Select
                value={role}
                onValueChange={(v) => setRole(v as "editor" | "viewer")}
              >
                <SelectTrigger id="role-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="editor">
                    Editor — can add and edit anything
                  </SelectItem>
                  <SelectItem value="viewer">
                    Viewer — read-only
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            {createMutation.isError && (
              <p className="text-sm text-destructive" role="alert">
                Could not generate link. Please try again.
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <Label htmlFor="invite-link-input">Invite link</Label>
            <div className="flex gap-2">
              <Input
                id="invite-link-input"
                readOnly
                value={inviteUrl}
                onFocus={(e) => e.currentTarget.select()}
              />
              <Button
                type="button"
                variant="secondary"
                onClick={handleCopy}
                className="shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" /> Copy
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Anyone with this link can join as <strong>{role}</strong>.
              The link expires after one use.
            </p>
          </div>
        )}

        <DialogFooter>
          {!generatedToken ? (
            <Button
              onClick={handleGenerate}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Generating..." : "Generate link"}
            </Button>
          ) : (
            <Button variant="secondary" onClick={() => handleOpenChange(false)}>
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

