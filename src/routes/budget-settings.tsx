import { useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
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
import { useAuth } from "@/lib/auth-context";
import { useBudget } from "@/queries/use-budget";
import { useBudgetMembers } from "@/queries/use-budget-members";
import {
  useUpdateBudget,
  useDeleteBudget,
} from "@/queries/use-budget-mutations";

export function BudgetSettings() {
  const { budgetId } = useParams<{ budgetId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const budgetQuery = useBudget(budgetId);
  const membersQuery = useBudgetMembers(budgetId);

  if (!budgetId || !user) return null;

  const isLoading = budgetQuery.isLoading || membersQuery.isLoading;
  if (isLoading) return <BudgetSettingsSkeleton />;

  const budget = budgetQuery.data;
  if (!budget) return null; // BudgetLayout already handles the not-found case

  const currentMember = membersQuery.data?.find((m) => m.user_id === user.id);
  const isOwner = currentMember?.role === "owner";

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          Budget settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{budget.name}</p>
      </div>

      {!isOwner ? (
        <p className="text-sm text-muted-foreground">
          Only the budget owner can change these settings.
        </p>
      ) : (
        <>
          <RenameSection budgetId={budgetId} currentName={budget.name} />
          <DangerZone
            budgetId={budgetId}
            budgetName={budget.name}
            onDeleted={() => navigate("/app", { replace: true })}
          />
        </>
      )}
    </div>
  );
}

// ─── Rename ───────────────────────────────────────────────────────────────────

function RenameSection({
  budgetId,
  currentName,
}: {
  budgetId: string;
  currentName: string;
}) {
  const [name, setName] = useState(currentName);
  const updateBudget = useUpdateBudget();

  // Re-sync if the budget name changes externally (e.g. another tab).
  const [syncedName, setSyncedName] = useState(currentName);
  if (currentName !== syncedName) {
    setSyncedName(currentName);
    setName(currentName);
  }

  const isDirty =
    name.trim() !== currentName.trim() && name.trim().length > 0;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await updateBudget.mutateAsync({ id: budgetId, name: name.trim() });
    } catch {
      // surfaced via mutation toast
    }
  };

  return (
    <section className="rounded-lg glass p-5 sm:p-6">
      <header className="mb-4">
        <h2 className="text-base font-medium">Rename budget</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          This name appears in the sidebar and budget list.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="budget-name" className="text-xs">
            Budget name
          </Label>
          <Input
            id="budget-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            autoComplete="off"
          />
        </div>

        <div className="flex justify-end pt-2 border-t border-border/40">
          <Button
            type="submit"
            disabled={!isDirty || updateBudget.isPending}
            className="bg-accent-solid hover:bg-accent-solid-hover text-white"
          >
            {updateBudget.isPending ? (
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
    </section>
  );
}

// ─── Danger zone ──────────────────────────────────────────────────────────────

function DangerZone({
  budgetId,
  budgetName,
  onDeleted,
}: {
  budgetId: string;
  budgetName: string;
  onDeleted: () => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const deleteBudget = useDeleteBudget();

  // Fetch row counts only when the dialog opens — no background queries.
  const countsQuery = useQuery({
    queryKey: ["budgetDeleteCounts", budgetId],
    enabled: dialogOpen,
    queryFn: async () => {
      const [txResult, incResult, savResult] = await Promise.all([
        supabase
          .from("transactions")
          .select("id", { count: "exact", head: true })
          .eq("budget_id", budgetId),
        supabase
          .from("income_entries")
          .select("id", { count: "exact", head: true })
          .eq("budget_id", budgetId),
        supabase
          .from("savings_entries")
          .select("id", { count: "exact", head: true })
          .eq("budget_id", budgetId),
      ]);
      return {
        transactions: txResult.count ?? 0,
        income: incResult.count ?? 0,
        savings: savResult.count ?? 0,
      };
    },
  });

  const nameMatches = confirmName === budgetName;

  const closeDialog = () => {
    setDialogOpen(false);
    setConfirmName("");
    setDeleteError(null);
  };

  const handleDelete = async () => {
    setDeleteError(null);
    try {
      await deleteBudget.mutateAsync({ id: budgetId });
      onDeleted();
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Something went wrong.",
      );
    }
  };

  return (
    <section className="rounded-lg glass border border-destructive/30 p-5 sm:p-6">
      <header className="mb-4">
        <h2 className="text-base font-medium text-destructive">Danger zone</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Permanent actions that cannot be undone.
        </p>
      </header>

      <Button
        variant="outline"
        className="border-destructive/50 text-destructive hover:bg-destructive/5 hover:text-destructive"
        onClick={() => setDialogOpen(true)}
      >
        Delete budget
      </Button>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) closeDialog();
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete "{budgetName}"?</DialogTitle>
            <DialogDescription>
              This permanently deletes the budget and all its data.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm">
            {countsQuery.isLoading ? (
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ) : (
              <ul className="space-y-1 text-muted-foreground list-disc list-inside">
                <li>{countsQuery.data?.transactions ?? 0} transactions</li>
                <li>{countsQuery.data?.income ?? 0} income entries</li>
                <li>{countsQuery.data?.savings ?? 0} savings entries</li>
                <li>All categories, items, and people</li>
                <li>All member access and pending invites</li>
              </ul>
            )}
            <p className="font-medium">This cannot be undone.</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirm-budget-name" className="text-xs">
              Type{" "}
              <span className="font-mono font-medium">{budgetName}</span> to
              confirm
            </Label>
            <Input
              id="confirm-budget-name"
              value={confirmName}
              onChange={(e) => {
                setConfirmName(e.target.value);
                setDeleteError(null);
              }}
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
              disabled={deleteBudget.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={
                !nameMatches ||
                deleteBudget.isPending ||
                countsQuery.isLoading
              }
            >
              {deleteBudget.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete budget"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function BudgetSettingsSkeleton() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="rounded-lg border border-border/60 p-5 sm:p-6 space-y-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-24 ml-auto" />
      </div>
    </div>
  );
}
