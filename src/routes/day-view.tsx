import { useParams } from "react-router-dom";
import { TransactionEntryForm } from "@/components/transactions/transaction-entry-form";

export function DayView() {
  const { budgetId, date } = useParams<{ budgetId: string; date: string }>();

  if (!budgetId || !date) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Day view</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Logging for {date}
        </p>
      </div>
      <TransactionEntryForm budgetId={budgetId} date={date} />
    </div>
  );
}