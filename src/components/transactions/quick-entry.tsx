import { useId, useState, type FormEvent } from "react";
import { CornerDownLeft, Zap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useItems } from "@/queries/use-items";
import { useCreateTransaction } from "@/queries/use-transaction-mutations";
import { parseQuickEntry } from "@/lib/search/parse-quick-entry";
import { formatDayLabel, todayISO } from "@/lib/format/date";

/** One-line entry: type "chai 120" (or "petrol 4,250 yesterday #trip") and press Enter. */
export function QuickEntry({
  budgetId,
  date,
  currency,
}: {
  budgetId: string;
  date: string;
  currency: string;
}) {
  const inputId = useId();
  const [text, setText] = useState("");
  const itemsQuery = useItems(budgetId);
  const createMutation = useCreateTransaction();

  const parsed = parseQuickEntry(text, itemsQuery.data ?? [], todayISO(), date);
  // A category that tracks people needs one; the full form below asks for it.
  const needsPerson = parsed.ok && !!parsed.item.category?.tracks_person;
  const ready = parsed.ok && !needsPerson;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!parsed.ok || needsPerson || !parsed.item.category) return;
    try {
      await createMutation.mutateAsync({
        budgetId,
        categoryId: parsed.item.category.id,
        itemId: parsed.item.id,
        date: parsed.date,
        amount: parsed.amount,
        tags: parsed.tags,
      });
      setText("");
    } catch {
      /* the mutation already shows the error; keep the text to retry */
    }
  };

  return (
    <form onSubmit={submit} className="space-y-1.5">
      <label htmlFor={inputId} className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
        <Zap className="h-4 w-4" aria-hidden />
        Quick entry
      </label>
      <div className="relative">
        <Input
          id={inputId}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="chai 120   ·   petrol 4,250 yesterday   ·   gym 5k #health"
          autoComplete="off"
          disabled={createMutation.isPending}
          className="pr-10"
        />
        <CornerDownLeft
          className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 ${
            ready ? "text-accent-text" : "text-muted-foreground/40"
          }`}
          aria-hidden
        />
      </div>
      <p
        className={`min-h-4 text-xs ${
          text.trim() && !ready ? "text-muted-foreground" : "text-foreground"
        }`}
        role="status"
      >
        {!text.trim()
          ? null
          : !parsed.ok
            ? parsed.reason
            : needsPerson
              ? `${parsed.item.name} needs a person, so use the full form below.`
              : (
                <>
                  Press Enter to add <strong className="font-semibold">{parsed.item.name}</strong>
                  {parsed.item.category && ` (${parsed.item.category.name})`} ·{" "}
                  <span className="tabular-nums">
                    {currency}{" "}
                    {parsed.amount.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>{" "}
                  · {formatDayLabel(parsed.date)}
                  {parsed.tags.length > 0 && ` · ${parsed.tags.map((t) => `#${t}`).join(" ")}`}
                </>
              )}
      </p>
    </form>
  );
}
