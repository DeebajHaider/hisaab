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
import { Switch } from "@/components/ui/switch";
import {
  useCreateCategory,
  useUpdateCategory,
} from "@/queries/use-category-mutations";
import type { Category } from "@/queries/use-categories";

interface CategoryFormDialogProps {
  budgetId: string;
  // If provided, dialog is in "edit" mode for that category.
  existing?: Category;
  // The trigger element (e.g., a button). Required for shadcn's Dialog API.
  trigger: ReactNode;
}

/**
 * Dialog for creating or editing a category.
 * Shape of the form is identical in both modes; differs only in submit behavior
 * and dialog title.
 */
export function CategoryFormDialog({
  budgetId,
  existing,
  trigger,
}: CategoryFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [tracksPerson, setTracksPerson] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const isEditing = !!existing;

  // When the dialog opens, sync state from `existing` (if editing) or reset (if creating).
  // Deliberately depends on `open` alone, not `existing` — `existing` comes
  // from a list query, and a background refetch of that list (triggered by
  // any sibling category mutation, or just window refocus) hands back a
  // new object reference even when nothing actually changed. Depending on
  // `existing` here would re-fire this effect mid-edit and silently
  // overwrite whatever the user has typed since opening.
  useEffect(() => {
    if (open) {
      setName(existing?.name ?? "");
      setTracksPerson(existing?.tracks_person ?? false);
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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
          patch: { name: trimmedName, tracksPerson },
        });
      } else {
        await createMutation.mutateAsync({
          budgetId,
          name: trimmedName,
          tracksPerson,
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
            {isEditing ? "Edit category" : "New category"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Rename or change settings for this category."
              : "A category groups related items, like Groceries or Vehicle."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cat-name">Name</Label>
            <Input
              id="cat-name"
              placeholder="e.g. Groceries"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={100}
              autoFocus
            />
          </div>

          <div className="flex items-start gap-3 rounded-md border border-border/60 p-3">
            <div className="flex-1">
              <Label htmlFor="cat-tracks-person" className="cursor-pointer">
                Track per-person
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Turn on for things split by family member, like Pocket Money or School Fees.
              </p>
            </div>
            <Switch
              id="cat-tracks-person"
              checked={tracksPerson}
              onCheckedChange={setTracksPerson}
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