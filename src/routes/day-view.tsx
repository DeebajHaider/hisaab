import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useTransactions } from "@/queries/use-transactions";
import {
  useCreateTransaction,
  useDeleteTransaction,
} from "@/queries/use-transaction-mutations";
import { useCategories } from "@/queries/use-categories";
import { useItems } from "@/queries/use-items";

export function DayView() {
  const { budgetId, date } = useParams<{ budgetId: string; date: string }>();
  const transactionsQuery = useTransactions(budgetId, date);
  const categoriesQuery = useCategories(budgetId);
  const itemsQuery = useItems(budgetId);
  const createTx = useCreateTransaction();
  const deleteTx = useDeleteTransaction();

  if (!budgetId || !date) return null;

  // Pick the first available category and item for the smoke test
  const firstCategory = categoriesQuery.data?.[0];
  const firstItem = itemsQuery.data?.find(
    (i) => i.category_id === firstCategory?.id,
  );

  const handleCreate = () => {
    if (!firstCategory || !firstItem) return;
    createTx.mutate({
      budgetId,
      categoryId: firstCategory.id,
      itemId: firstItem.id,
      date,
      amount: Math.round(Math.random() * 1000) / 10,
      notes: "smoke test",
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <h1 className="text-xl font-semibold">Day view (smoke test) — {date}</h1>

      <div className="flex gap-2">
        <Button
          onClick={handleCreate}
          disabled={createTx.isPending || !firstItem}
        >
          {createTx.isPending ? "Creating..." : "Create test transaction"}
        </Button>
      </div>

      {!firstItem && (
        <p className="text-sm text-muted-foreground">
          You need at least one category with one item to test. Go to Manage and add some.
        </p>
      )}

      <div className="space-y-2">
        {transactionsQuery.isLoading && <p>Loading transactions...</p>}
        {transactionsQuery.data?.map((tx) => (
          <div
            key={tx.id}
            className="flex items-center gap-3 p-3 rounded border border-border/60"
          >
            <div className="flex-1 text-sm">
              <span className="font-medium">{tx.item?.name}</span>
              <span className="text-muted-foreground"> · {tx.category?.name}</span>
              <span className="ml-2 tabular-nums">{tx.amount}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deleteTx.mutate({ id: tx.id, budgetId })}
              disabled={deleteTx.isPending}
            >
              Delete
            </Button>
          </div>
        ))}
        {transactionsQuery.data?.length === 0 && (
          <p className="text-sm text-muted-foreground">No transactions for this date.</p>
        )}
      </div>
    </div>
  );
}