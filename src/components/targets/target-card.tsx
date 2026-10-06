import { useState } from "react";
import { Pencil, Trash2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { TargetFormDialog } from "./target-form-dialog";
import { useTargetSpent } from "@/queries/use-target-spent";
import { useCreateTarget, useDeleteTarget } from "@/queries/use-target-mutations";
import { calculateProgress } from "@/lib/calculations/target-progress";
import { nextPeriod } from "@/lib/calculations/next-target-period";
import { projectTargetPace } from "@/lib/calculations/target-pace";
import { describeTimeline, targetTimeline } from "@/lib/calculations/target-timeline";
import { TargetWeeklyBreakdown } from "./target-weekly-breakdown";
import { todayISO, formatDayLabel } from "@/lib/format/date";
import { cn } from "@/lib/utils";
import type { Target } from "@/queries/use-targets";
import type { Category } from "@/queries/use-categories";
import type { ItemWithCategory } from "@/queries/use-items";

interface TargetCardProps {
  budgetId: string;
  currency: string;
  target: Target;
  categories: Category[];
  items: ItemWithCategory[];
}

function formatAmount(amount: number, currency: string): string {
  return `${currency} ${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const STATUS_COLOR = {
  under: "bg-emerald-500",
  near: "bg-amber-500",
  over: "bg-red-500",
} as const;

export function TargetCard({ budgetId, currency, target, categories, items }: TargetCardProps) {
  const spentQuery = useTargetSpent(budgetId, target);
  const createMutation = useCreateTarget();
  const deleteMutation = useDeleteTarget();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const spent = spentQuery.data ?? 0;
  const { percent, status } = calculateProgress(spent, target.target_amount);
  const isPast = target.end_date < todayISO();
  const timeline = targetTimeline({
    spent,
    targetAmount: target.target_amount,
    startDate: target.start_date,
    endDate: target.end_date,
    today: todayISO(),
  });
  const pace = projectTargetPace({
    spent,
    targetAmount: target.target_amount,
    startDate: target.start_date,
    endDate: target.end_date,
    today: todayISO(),
  });

  const trackedNames = [
    ...categories.filter((c) => target.category_ids.includes(c.id)).map((c) => c.name),
    ...items.filter((i) => target.item_ids.includes(i.id)).map((i) => i.name),
  ];

  const handleRenew = () => {
    const next = nextPeriod(target.start_date, target.end_date);
    createMutation.mutate({
      budgetId,
      name: target.name,
      targetAmount: target.target_amount,
      startDate: next.start,
      endDate: next.end,
      categoryIds: target.category_ids,
      itemIds: target.item_ids,
    });
  };

  const renewLabel = (() => {
    const next = nextPeriod(target.start_date, target.end_date);
    return `Renew through ${formatDayLabel(next.end)}`;
  })();

  return (
    <div className="rounded-lg glass p-4 space-y-3">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div className="min-w-0">
          <h3 className="font-medium truncate">{target.name}</h3>
          <p className="text-xs text-muted-foreground">
            {formatDayLabel(target.start_date)} – {formatDayLabel(target.end_date)}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <TargetFormDialog
            budgetId={budgetId}
            categories={categories}
            items={items}
            existing={target}
            trigger={
              <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={`Edit ${target.name}`}>
                <Pencil className="h-4 w-4" />
              </Button>
            }
          />
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => setConfirmDelete(true)}
            aria-label={`Delete ${target.name}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {trackedNames.map((name) => (
          <span
            key={name}
            className="inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground"
          >
            {name}
          </span>
        ))}
      </div>

      <div className="space-y-1.5">
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", STATUS_COLOR[status])}
            style={{ width: `${Math.min(percent, 100)}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-sm tabular-nums">
          <span
            className={cn(
              "font-medium",
              status === "over"
                ? "text-red-600 dark:text-red-400"
                : status === "near"
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-emerald-600 dark:text-emerald-400",
            )}
          >
            {formatAmount(spent, currency)}
          </span>
          <span className="text-muted-foreground">of {formatAmount(target.target_amount, currency)}</span>
        </div>
      </div>

      <div className="space-y-0.5 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">
          {describeTimeline(timeline, target.end_date, todayISO())}
        </p>
        {timeline.phase === "active" && timeline.remaining < 0 && (
          <p className="text-red-600 dark:text-red-400">
            Over by {formatAmount(-timeline.remaining, currency)}.
          </p>
        )}
        {timeline.phase === "active" && timeline.perDayLeft !== null && (
          <p>
            {formatAmount(timeline.remaining, currency)} left, about{" "}
            {formatAmount(timeline.perDayLeft, currency)} a day to stay within it.
          </p>
        )}
        {timeline.phase !== "upcoming" && timeline.avgPerDay !== null && (
          <p>
            Averaging {formatAmount(timeline.avgPerDay, currency)} a day
            {timeline.phase === "active" ? " so far" : ""}.
          </p>
        )}
      </div>

      {pace && (
        <p
          className={cn(
            "text-xs",
            pace.willExceed ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground",
          )}
        >
          At this pace you'll reach {formatAmount(pace.projected, currency)} by{" "}
          {formatDayLabel(target.end_date)} ({Math.round(pace.projectedPercent)}% of the target).
        </p>
      )}

      <TargetWeeklyBreakdown budgetId={budgetId} target={target} currency={currency} />

      {isPast && (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          disabled={createMutation.isPending}
          onClick={handleRenew}
        >
          <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
          {renewLabel}
        </Button>
      )}

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{target.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This only removes the target — the transactions it was tracking aren't affected.
              This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                deleteMutation.mutate({ id: target.id, budgetId });
                setConfirmDelete(false);
              }}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
