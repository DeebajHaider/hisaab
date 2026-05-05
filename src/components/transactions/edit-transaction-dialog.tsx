import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TransactionEntryForm } from "./transaction-entry-form";
import type { TransactionWithRelations } from "@/queries/use-transactions";

interface EditTransactionDialogProps {
  budgetId: string;
  date: string;
  // The transaction being edited. null = closed.
  transaction: TransactionWithRelations | null;
  onClose: () => void;
}

/**
 * Modal wrapper around TransactionEntryForm in edit mode.
 * Open state is driven by whether `transaction` is non-null.
 */
export function EditTransactionDialog({
  budgetId,
  date,
  transaction,
  onClose,
}: EditTransactionDialogProps) {
  return (
    <Dialog open={!!transaction} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit transaction</DialogTitle>
          <DialogDescription>
            Update the details of this transaction.
          </DialogDescription>
        </DialogHeader>
        {transaction && (
          // The `key` ensures the form remounts cleanly when switching between
          // different transactions to edit, avoiding stale-state bugs.
          <TransactionEntryForm
            key={transaction.id}
            budgetId={budgetId}
            date={transaction.date}
            existing={transaction}
            onSaved={onClose}
            onCancel={onClose}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}