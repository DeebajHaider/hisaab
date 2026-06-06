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
  useCreateAssetClass,
  useUpdateAssetClass,
} from "@/queries/use-asset-class-mutations";
import type { AssetClass } from "@/queries/use-asset-classes";

interface AssetClassFormDialogProps {
  portfolioId: string;
  // If provided, dialog is in "edit" mode for that asset class.
  existing?: AssetClass;
  trigger: ReactNode;
}

/**
 * Create or rename an asset class. Mirrors CategoryFormDialog, minus the
 * per-person switch — asset classes are just a name.
 */
export function AssetClassFormDialog({
  portfolioId,
  existing,
  trigger,
}: AssetClassFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const createMutation = useCreateAssetClass();
  const updateMutation = useUpdateAssetClass();
  const isEditing = !!existing;

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
          portfolioId,
          name: trimmedName,
        });
      } else {
        await createMutation.mutateAsync({ portfolioId, name: trimmedName });
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
            {isEditing ? "Edit asset class" : "New asset class"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Rename this asset class."
              : "An asset class groups holdings, like Stocks, Property, or Gold."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ac-name">Name</Label>
            <Input
              id="ac-name"
              placeholder="e.g. Stocks"
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

