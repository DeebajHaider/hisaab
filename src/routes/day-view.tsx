import { useParams } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useBudget } from "@/queries/use-budget";
import { useTransactions } from "@/queries/use-transactions";
import { calculateDayTotal } from "@/lib/calculations/day-totals";
import { TransactionEntryForm } from "@/components/transactions/transaction-entry-form";
import { DayHeader } from "@/components/transactions/day-header";
import { TransactionList } from "@/components/transactions/transaction-list";

export function DayView() {
  const { budgetId, date } = useParams<{ budgetId: string; date: string }>();
  const budgetQuery = useBudget(budgetId);
  const transactionsQuery = useTransactions(budgetId, date);

  if (!budgetId || !date) return null;

  const budget = budgetQuery.data;
  const transactions = transactionsQuery.data ?? [];
  const total = calculateDayTotal(transactions);
  const currency = budget?.currency ?? "PKR";

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-4">
      <DayHeader
        budgetId={budgetId}
        date={date}
        total={total}
        currency={currency}
      />

      <TransactionEntryForm budgetId={budgetId} date={date} />

      {transactionsQuery.isLoading ? (
        <ListSkeleton />
      ) : (
        <TransactionList
          transactions={transactions}
          currency={currency}
          // Stub handlers — wired up in next step
          onEdit={(t) => console.log("edit", t)}
          onDelete={(t) => console.log("delete", t)}
        />
      )}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1].map((i) => (
        <div
          key={i}
          className="rounded-lg border border-border/60 p-4 space-y-2"
        >
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ))}
    </div>
  );
}