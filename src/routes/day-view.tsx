import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useBudget } from "@/queries/use-budget";
import {
  useTransactions,
  type TransactionWithRelations,
} from "@/queries/use-transactions";
import { calculateDayTotal } from "@/lib/calculations/day-totals";
import { TransactionEntryForm } from "@/components/transactions/transaction-entry-form";
import { QuickAddTemplates } from "@/components/transactions/quick-add-templates";
import { DayHeader } from "@/components/transactions/day-header";
import { TransactionList } from "@/components/transactions/transaction-list";
import { EditTransactionDialog } from "@/components/transactions/edit-transaction-dialog";
import { DeleteTransactionDialog } from "@/components/transactions/delete-transaction-dialog";
import { addDays } from "@/lib/format/date";

export function DayView() {
  const { budgetId, date } = useParams<{ budgetId: string; date: string }>();
  const navigate = useNavigate();
  const budgetQuery = useBudget(budgetId);
  const transactionsQuery = useTransactions(budgetId, date);

  const [editing, setEditing] = useState<TransactionWithRelations | null>(null);
  const [deleting, setDeleting] = useState<TransactionWithRelations | null>(null);

  // --- Keyboard navigation ---------------------------------------------------
  // Left/right arrows move to the previous/next day, but ONLY when:
  //   - no dialog is open (edit or delete)
  //   - focus isn't inside an input/textarea/contenteditable
  //   - focus isn't inside an open popover/dropdown/listbox
  // The popover/dropdown check covers the calendar picker, the item-search
  // combobox, and the Select dropdowns — they all need arrows for their own
  // navigation. role="combobox"/"listbox"/"dialog" are what Radix renders.
  useEffect(() => {
    if (!budgetId || !date) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      // Don't intercept when modifier keys are held — the user might be
      // doing browser navigation (Alt+Left) or text selection (Shift+Arrow).
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (editing || deleting) return;

      const active = document.activeElement as HTMLElement | null;
      if (active) {
        const tag = active.tagName;
        if (
          tag === "INPUT" ||
          tag === "TEXTAREA" ||
          tag === "SELECT" ||
          active.isContentEditable
        ) {
          return;
        }
        // Inside an open dropdown / popover / dialog content?
        if (active.closest('[role="combobox"], [role="listbox"], [role="dialog"]')) {
          return;
        }
      }

      e.preventDefault();
      const target = e.key === "ArrowLeft" ? addDays(date, -1) : addDays(date, 1);
      navigate(`/app/budgets/${budgetId}/day/${target}`);
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [budgetId, date, editing, deleting, navigate]);

  if (!budgetId || !date) return null;

  const budget = budgetQuery.data;
  const transactions = transactionsQuery.data ?? [];
  const total = calculateDayTotal(transactions);
  const currency = budget?.currency ?? "PKR";

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-4">
      <DayHeader budgetId={budgetId} date={date} total={total} currency={currency} />

      {transactionsQuery.isLoading ? (
        <ListSkeleton />
      ) : (
        <TransactionList
          transactions={transactions}
          currency={currency}
          onEdit={setEditing}
          onDelete={setDeleting}
        />
      )}

      <QuickAddTemplates budgetId={budgetId} date={date} currency={currency} />

      <TransactionEntryForm budgetId={budgetId} date={date} />

      <EditTransactionDialog
        budgetId={budgetId}
        transaction={editing}
        onClose={() => setEditing(null)}
      />

      <DeleteTransactionDialog
        budgetId={budgetId}
        transaction={deleting}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1].map((i) => (
        <div key={i} className="rounded-lg border border-border/60 p-4 space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ))}
    </div>
  );
}

