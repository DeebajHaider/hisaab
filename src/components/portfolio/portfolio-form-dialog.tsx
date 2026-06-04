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

  // Re-sync the field whenever we (re)open in edit mode.
  useEffect(() => {
    if (open) {
      setName(existing?.name ?? "");
      setError(null);
    }
  }, [open, existing]);

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
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-teal-600 hover:bg-teal-700 text-white"
          >
            {isEdit ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
