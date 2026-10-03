import { useState } from "react";
import { CopyPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useTransactions } from "@/queries/use-transactions";
import { useCopyTransactions } from "@/queries/use-transaction-mutations";
import { buildCopies } from "@/lib/calculations/copy-transactions";
import { calculateDayTotal } from "@/lib/calculations/day-totals";
import { addDays, formatDayLabel } from "@/lib/format/date";

interface CopyPreviousDayProps {
  budgetId: string;
  date: string;
  currency: string;
}

/** For days that look like the one before: re-log all of the previous day's
 *  entries here after a confirm. Renders nothing when the previous day is empty. */
export function CopyPreviousDay({ budgetId, date, currency }: CopyPreviousDayProps) {
  const previousDate = addDays(date, -1);
  const previousQuery = useTransactions(budgetId, previousDate);
  const copyMutation = useCopyTransactions();
  const [open, setOpen] = useState(false);

  const source = previousQuery.data ?? [];
  if (source.length === 0) return null;

  const count = source.length;
  const noun = count === 1 ? "transaction" : "transactions";
  const fromLabel = formatDayLabel(previousDate);
  const toLabel = formatDayLabel(date);
  const total = calculateDayTotal(source).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const confirm = () => {
    copyMutation.mutate({
      budgetId,
      rows: buildCopies(source, date, () => crypto.randomUUID()),
    });
    setOpen(false);
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        disabled={copyMutation.isPending}
        className="h-9 px-2 text-muted-foreground hover:text-foreground"
      >
        <CopyPlus className="mr-1.5 h-4 w-4" />
        Copy {count} {noun} from {fromLabel}
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Copy {fromLabel}'s {noun} to {toLabel}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {count} {noun} totalling {currency} {total} will be added to {toLabel}.
              Notes aren't copied, and you can undo right afterwards.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirm}>Copy</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
