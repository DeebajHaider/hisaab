import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LedgerFilters } from "@/components/ledger/ledger-filters";
import { LedgerDayGroup } from "@/components/ledger/ledger-day-group";
import { useBudget } from "@/queries/use-budget";
import { useCategories } from "@/queries/use-categories";
import { useItems } from "@/queries/use-items";
import { useEarliestTransactionMonth } from "@/queries/use-earliest-transaction-month";
import { useLedgerTransactions, LEDGER_ROW_CAP } from "@/queries/use-ledger-transactions";
import { calculateDayTotal } from "@/lib/calculations/day-totals";
import { groupTransactionsByDay } from "@/lib/calculations/group-by-day";
import {
  resolveLedgerPreset,
  LEDGER_PRESETS,
  type LedgerPreset,
} from "@/lib/calculations/resolve-ledger-preset";
import { todayISO } from "@/lib/format/date";
import { firstDayOfMonth } from "@/lib/format/year-month";

export function Ledger() {
  const { budgetId } = useParams<{ budgetId: string }>();

  const [from, setFrom] = useState(
    () => resolveLedgerPreset("this-month", todayISO(), null).from,
  );
  const [to, setTo] = useState(() => todayISO());
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [itemIds, setItemIds] = useState<string[]>([]);

  const budgetQuery = useBudget(budgetId);
  const categoriesQuery = useCategories(budgetId);
  const itemsQuery = useItems(budgetId);
  const earliestQuery = useEarliestTransactionMonth(budgetId);
  const ledgerQuery = useLedgerTransactions(budgetId, { from, to, categoryIds, itemIds });

  const categories = categoriesQuery.data ?? [];
  const items = itemsQuery.data ?? [];
  const earliestDate = earliestQuery.data ? firstDayOfMonth(earliestQuery.data) : null;

  // Which preset (if any) the current from/to matches — purely derived, no
  // separate "selected preset" state to keep in sync. Once the user edits
  // the date pickers by hand, this naturally falls back to null (no preset
  // highlighted), which is correct: the range is custom now.
  const activePreset = useMemo(() => {
    const today = todayISO();
    return (
      LEDGER_PRESETS.find((preset) => {
        const range = resolveLedgerPreset(preset, today, earliestDate);
        return range.from === from && range.to === to;
      }) ?? null
    );
  }, [from, to, earliestDate]);

  const handlePresetSelect = (preset: LedgerPreset) => {
    const range = resolveLedgerPreset(preset, todayISO(), earliestDate);
    setFrom(range.from);
    setTo(range.to);
  };

  const handleToggleCategory = (id: string) => {
    setCategoryIds((prev) => {
      const next = prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id];
      if (next.length > 0) {
        const allowed = new Set(
          items.filter((i) => next.includes(i.category_id)).map((i) => i.id),
        );
        setItemIds((ids) => ids.filter((iid) => allowed.has(iid)));
      }
      return next;
    });
  };

  const handleToggleItem = (id: string) => {
    setItemIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  if (!budgetId) return null;

  const budget = budgetQuery.data;
  const currency = budget?.currency ?? "PKR";
  const transactions = ledgerQuery.data ?? [];
  const groups = groupTransactionsByDay(transactions);
  const total = calculateDayTotal(transactions);
  const truncated = transactions.length === LEDGER_ROW_CAP;

  const isLoading =
    budgetQuery.isLoading ||
    categoriesQuery.isLoading ||
    itemsQuery.isLoading ||
    ledgerQuery.isLoading;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Ledger</h1>
        <p className="text-sm text-muted-foreground">
          Search your transaction history by date range, category, or item.
        </p>
      </div>

      <LedgerFilters
        from={from}
        to={to}
        onFromChange={setFrom}
        onToChange={setTo}
        activePreset={activePreset}
        onPresetSelect={handlePresetSelect}
        categories={categories}
        selectedCategoryIds={categoryIds}
        onToggleCategory={handleToggleCategory}
        items={items}
        selectedItemIds={itemIds}
        onToggleItem={handleToggleItem}
      />

      {!isLoading && (
        <div className="flex items-center justify-between flex-wrap gap-2 px-1">
          <p className="text-sm text-muted-foreground">
            {transactions.length} transaction{transactions.length === 1 ? "" : "s"}
          </p>
          <p className="text-sm font-medium tabular-nums">
            Total: {currency}{" "}
            {total.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </p>
        </div>
      )}

      {truncated && !isLoading && (
        <p className="text-xs text-muted-foreground px-1">
          Showing the most recent {LEDGER_ROW_CAP} matching transactions. Narrow the
          date range or filters to see everything and get an accurate total.
        </p>
      )}

      {isLoading ? (
        <ListSkeleton />
      ) : groups.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>No transactions match these filters.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => (
            <LedgerDayGroup
              key={group.date}
              budgetId={budgetId}
              group={group}
              currency={currency}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-lg border border-border/60 p-4 space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ))}
    </div>
  );
}
