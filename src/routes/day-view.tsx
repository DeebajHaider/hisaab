import { useEffect, useRef, useState, type RefObject } from "react";
import { Plus } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useBudget } from "@/queries/use-budget";
import {
  useTransactions,
  type TransactionWithRelations,
} from "@/queries/use-transactions";
import { useDeleteTransaction } from "@/queries/use-transaction-mutations";
import { calculateDayTotal } from "@/lib/calculations/day-totals";
import { TransactionEntryForm } from "@/components/transactions/transaction-entry-form";
import { QuickAddTemplates } from "@/components/transactions/quick-add-templates";
import { CopyPreviousDay } from "@/components/transactions/copy-previous-day";
import { buildRepeatDraft, type RepeatDraft } from "@/lib/calculations/copy-transactions";
import { DayHeader } from "@/components/transactions/day-header";
import { TransactionList } from "@/components/transactions/transaction-list";
import { EditTransactionDialog } from "@/components/transactions/edit-transaction-dialog";
import { addDays } from "@/lib/format/date";
import { ErrorBanner } from "@/components/ui/error-banner";

export function DayView() {
  const { budgetId, date } = useParams<{ budgetId: string; date: string }>();
  const navigate = useNavigate();
  const budgetQuery = useBudget(budgetId);
  const transactionsQuery = useTransactions(budgetId, date);

  const [editing, setEditing] = useState<TransactionWithRelations | null>(null);
  const deleteMutation = useDeleteTransaction();
  const formRef = useRef<HTMLDivElement>(null);
  // "Log again": a fresh nonce remounts the form with the chosen transaction as its starting point.
  const [repeat, setRepeat] = useState<{ draft: RepeatDraft; nonce: number } | null>(null);

  // --- Keyboard navigation ---------------------------------------------------
  // Left/right arrows move to the previous/next day, but ONLY when:
  //   - no dialog is open (edit)
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
      if (editing) return;

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
  }, [budgetId, date, editing, navigate]);

  if (!budgetId || !date) return null;

  const budget = budgetQuery.data;
  const transactions = transactionsQuery.data ?? [];
  const total = calculateDayTotal(transactions);
  const currency = budget?.currency ?? "PKR";

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6 sm:space-y-8">
      <DayHeader budgetId={budgetId} date={date} total={total} currency={currency} />

      {transactionsQuery.isLoading ? (
        <ListSkeleton />
      ) : transactionsQuery.error ? (
        <ErrorBanner context="transactions" error={transactionsQuery.error} />
      ) : (
        <TransactionList
          transactions={transactions}
          currency={currency}
          onEdit={setEditing}
          onRepeat={(tx) => {
            setRepeat({ draft: buildRepeatDraft(tx), nonce: Date.now() });
            formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
          onDelete={(tx) =>
            // No confirm step: the toast's Undo is faster and safer.
            deleteMutation.mutate({ id: tx.id, budgetId, snapshot: tx })
          }
        />
      )}

      <CopyPreviousDay budgetId={budgetId} date={date} currency={currency} />

      <QuickAddTemplates budgetId={budgetId} date={date} currency={currency} />

      {/* Deliberately not sticky: on phones the form is about a full
          viewport tall, so pinning it covers the whole transaction list.
          JumpToFormButton covers the "get back to the form" need instead. */}
      <div ref={formRef} className="scroll-mt-20">
        <TransactionEntryForm
          key={repeat?.nonce ?? "fresh"}
          initial={repeat?.draft ?? null}
          budgetId={budgetId}
          date={date}
        />
      </div>
      <JumpToFormButton targetRef={formRef} />

      <EditTransactionDialog
        budgetId={budgetId}
        transaction={editing}
        onClose={() => setEditing(null)}
      />

    </div>
  );
}

/** Mobile-only shortcut back to the entry form, shown while it's off-screen. */
function JumpToFormButton({ targetRef }: { targetRef: RefObject<HTMLDivElement | null> }) {
  const [formVisible, setFormVisible] = useState(true);

  useEffect(() => {
    const el = targetRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) =>
      setFormVisible(entry.isIntersecting),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [targetRef]);

  if (formVisible) return null;

  const jump = () => {
    const el = targetRef.current;
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    el.querySelector<HTMLInputElement>("#search-input")?.focus({ preventScroll: true });
  };

  return (
    <button
      type="button"
      onClick={jump}
      aria-label="Add a transaction"
      className="lg:hidden fixed right-5 bottom-[calc(4.5rem+env(safe-area-inset-bottom)+0.75rem)] z-30 flex h-14 w-14 items-center justify-center rounded-full bg-accent-solid text-white hover:bg-accent-solid-hover animate-in fade-in zoom-in-90 duration-150"
    >
      <Plus className="h-6 w-6" />
    </button>
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

