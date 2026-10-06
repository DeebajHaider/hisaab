import { useState, type FormEvent, type ReactNode } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  useCreateIncomeTemplate,
  useUpdateIncomeTemplate,
} from "@/queries/use-income-template-mutations";
import type { IncomeTemplate } from "@/queries/use-income-templates";

interface IncomeTemplateFormDialogProps {
  budgetId: string;
  existing?: IncomeTemplate;
  trigger: ReactNode;
}

export function IncomeTemplateFormDialog({
  budgetId,
  existing,
  trigger,
}: IncomeTemplateFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const createMutation = useCreateIncomeTemplate();
  const updateMutation = useUpdateIncomeTemplate();
  const isEditing = !!existing;
  const isPending = createMutation.isPending || updateMutation.isPending;

  // Fill the form when the dialog opens (not on every refetch of `existing`,
  // which would clobber what's being typed).
  const handleOpenChange = (next: boolean) => {
    if (next) {
      setSource(existing?.source ?? "");
      setAmount(existing ? String(existing.amount) : "");
      setNotes(existing?.notes ?? "");
      setError(null);
    }
    setOpen(next);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedSource = source.trim();
    if (!trimmedSource) {
      setError("Give it a name, like Salary");
      return;
    }
    const parsedAmount = Number(amount);
    if (amount.trim() === "" || Number.isNaN(parsedAmount) || parsedAmount < 0) {
      setError("Amount must be a non-negative number");
      return;
    }
    const trimmedNotes = notes.trim() || null;

    try {
      if (existing) {
        await updateMutation.mutateAsync({
          id: existing.id,
          budgetId,
          patch: { source: trimmedSource, amount: parsedAmount, notes: trimmedNotes },
        });
      } else {
        await createMutation.mutateAsync({
          budgetId,
          source: trimmedSource,
          amount: parsedAmount,
          notes: trimmedNotes,
        });
      }
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit income template" : "New income template"}</DialogTitle>
          <DialogDescription>
            A saved income entry you can add with one click from the Month view.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="income-template-source">Source</Label>
            <Input
              id="income-template-source"
              placeholder="e.g. Salary"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              maxLength={100}
              autoComplete="off"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="income-template-amount">Amount</Label>
            <Input
              id="income-template-amount"
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min={0}
              step="0.01"
              placeholder="0.00"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="income-template-notes" className="text-xs">
              Notes (optional)
            </Label>
            <Textarea
              id="income-template-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="text-sm"
            />
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-accent-solid hover:bg-accent-solid-hover text-white"
              disabled={isPending || !source.trim() || !amount.trim()}
            >
              {isPending ? (isEditing ? "Saving..." : "Creating...") : isEditing ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
