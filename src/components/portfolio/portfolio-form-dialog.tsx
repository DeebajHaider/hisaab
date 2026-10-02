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
import { useCreatePortfolio, useUpdatePortfolio } from "@/queries/use-portfolio-mutations";
import type { Portfolio } from "@/queries/use-portfolios";

type Props = {
  existing?: Portfolio;
  trigger?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function PortfolioFormDialog({
  existing,
  trigger,
  open: openProp,
  onOpenChange,
}: Props) {
  const isEdit = !!existing;
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const [name, setName] = useState(existing?.name ?? "");
  const [error, setError] = useState<string | null>(null);

  const createPortfolio = useCreatePortfolio();
  const updatePortfolio = useUpdatePortfolio();
  const isPending = createPortfolio.isPending || updatePortfolio.isPending;

  // Re-sync the field when the dialog opens. Depends on `open` alone, not
  // `existing` — see CategoryFormDialog's dialog for why (a background
  // refetch of the portfolios list would otherwise re-fire this mid-edit
  // and clobber whatever the user has typed).
  useEffect(() => {
    if (open) {
      setName(existing?.name ?? "");
      setError(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Give the portfolio a name.");
      return;
    }
    try {
      if (isEdit) {
        await updatePortfolio.mutateAsync({ id: existing!.id, name: trimmed });
      } else {
        await createPortfolio.mutateAsync({ name: trimmed });
      }
      setOpen(false);
    } catch {
      // The mutation's onError already fired a toast; keep the dialog open.
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Rename portfolio" : "Create portfolio"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the name of this portfolio."
              : "A portfolio is your private container for what you own. Asset classes are added for you."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="portfolio-name">Name</Label>
            <Input
              id="portfolio-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. My investments"
              autoFocus
            />
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-accent-solid hover:bg-accent-solid-hover text-white"
              disabled={isPending || !name.trim()}
            >
              {isPending
                ? isEdit
                  ? "Saving..."
                  : "Creating..."
                : isEdit
                  ? "Save"
                  : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
