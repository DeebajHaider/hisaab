import { useState, useEffect, type FormEvent, type ReactNode } from "react";
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
  useCreatePerson,
  useUpdatePerson,
} from "@/queries/use-people-mutations";
import type { Person } from "@/queries/use-people";

interface PersonFormDialogProps {
  budgetId: string;
  // If provided, dialog is in "edit" mode for that person.
  existing?: Person;
  // The trigger element (e.g., a button). Required for shadcn's Dialog API.
  trigger: ReactNode;
}

/**
 * Dialog for creating or editing a person.
 * Same shape and behavior as CategoryFormDialog; just one field (name).
 */
export function PersonFormDialog({
  budgetId,
  existing,
  trigger,
}: PersonFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const createMutation = useCreatePerson();
  const updateMutation = useUpdatePerson();
  const isEditing = !!existing;

  // Sync state from `existing` when the dialog opens. useEffect on `open`
  // runs only on open-transition, matching the CategoryFormDialog pattern.
  useEffect(() => {
    if (open) {
      setName(existing?.name ?? "");
      setError(null);
    }
  }, [open, existing]);

  const isPending = createMutation.isPending || updateMutation.isPending;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Name is required");
      return;
    }

    try {
      if (isEditing) {
        await updateMutation.mutateAsync({
          id: existing.id,
          budgetId,
          patch: { name: trimmedName },
        });
      } else {
        await createMutation.mutateAsync({
          budgetId,
          name: trimmedName,
        });
      }
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit person" : "New person"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Rename this person. Existing transactions tagged to them stay attributed."
              : "Add a name to attribute transactions to in tracked categories like Pocket Money or School Fees."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="person-name">Name</Label>
            <Input
              id="person-name"
              placeholder="e.g. Minhal"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
              autoFocus
            />
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-teal-600 hover:bg-teal-700 text-white"
              disabled={isPending || !name.trim()}
            >
              {isPending
                ? isEditing
                  ? "Saving..."
                  : "Creating..."
                : isEditing
                  ? "Save"
                  : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
