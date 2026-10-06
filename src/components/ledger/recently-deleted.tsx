import { useState } from "react";
import { ChevronRight, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRestoreDeleted } from "@/queries/use-transaction-mutations";
import { KEEP_DAYS, readDeleted, type DeletedRecord } from "@/lib/recently-deleted";
import { formatDayLabel } from "@/lib/format/date";

/** Transactions deleted on this device in the last month, with a way to put them back.
 *  A longer safety net than the Undo toast. Renders nothing when there are none. */
export function RecentlyDeleted({
  userId,
  budgetId,
  currency,
}: {
  userId: string;
  budgetId: string;
  currency: string;
}) {
  const [open, setOpen] = useState(false);
  const restore = useRestoreDeleted();
  // Read on each render: restoring and deleting both re-render the page, and
  // the list is tiny (capped), so a stored copy in state would only go stale.
  const records = readDeleted(userId, budgetId);

  if (records.length === 0) return null;

  return (
    <section className="rounded-lg glass">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronRight className={`h-4 w-4 transition-transform ${open ? "rotate-90" : ""}`} />
        Recently deleted ({records.length})
      </button>

      {open && (
        <div className="border-t border-border/40">
          <p className="px-3 pt-2 text-xs text-muted-foreground">
            Kept on this device for {KEEP_DAYS} days.
          </p>
          <ul className="divide-y divide-border/30">
            {records.map((record) => (
              <Row
                key={record.row.id}
                record={record}
                currency={currency}
                pending={restore.isPending}
                onRestore={() => restore.mutate({ userId, budgetId, row: record.row })}
              />
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function Row({
  record,
  currency,
  pending,
  onRestore,
}: {
  record: DeletedRecord;
  currency: string;
  pending: boolean;
  onRestore: () => void;
}) {
  const { row } = record;
  return (
    <li className="flex items-center gap-3 px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {record.itemName ?? "Unknown item"}
          {record.categoryName && (
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              {record.categoryName}
            </span>
          )}
        </p>
        <p className="text-xs text-muted-foreground">{formatDayLabel(row.date)}</p>
      </div>
      <span className="shrink-0 text-sm tabular-nums">
        {currency}{" "}
        {Number(row.amount).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </span>
      <Button size="sm" variant="outline" disabled={pending} onClick={onRestore}>
        <Undo2 className="mr-1.5 h-3.5 w-3.5" />
        Restore
      </Button>
    </li>
  );
}
