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
import { useDeleteTransaction } from "@/queries/use-transaction-mutations";
import type { TransactionWithRelations } from "@/queries/use-transactions";

interface DeleteTransactionDialogProps {
  budgetId: string;
  // The transaction to delete. null = closed.
  transaction: TransactionWithRelations | null;
  onClose: () => void;
}

export function DeleteTransactionDialog({
  budgetId,
  transaction,
  onClose,
}: DeleteTransactionDialogProps) {
  const deleteMutation = useDeleteTransaction();

  const handleConfirm = async () => {
    if (!transaction) return;
    try {
      await deleteMutation.mutateAsync({
        id: transaction.id,
        budgetId,
      });
      onClose();
    } catch {
      // Error stays visible on the row; the dialog won't close automatically.
      // For now we just leave it open and let the user retry or cancel.
    }
  };

  return (
    <AlertDialog
      open={!!transaction}
      onOpenChange={(open) => !open && !deleteMutation.isPending && onClose()}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this transaction?</AlertDialogTitle>
          <AlertDialogDescription>
            {transaction && (
              <>
                <span className="font-medium text-foreground">
                  {transaction.item?.name}
                </span>{" "}
                — {transaction.amount}{" "}
                {transaction.category?.name && (
                  <>· {transaction.category.name}</>
                )}
                <br />
                This can't be undone. The transaction will be permanently removed.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteMutation.isPending}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={deleteMutation.isPending}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            {deleteMutation.isPending ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}