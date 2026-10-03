import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useIncome, type IncomeEntry } from "@/queries/use-income";
import { useDeleteIncome } from "@/queries/use-income-mutations";
import { IncomeFormDialog } from "./income-form-dialog";
import { DeleteConfirmDialog } from "./delete-confirm-dialog";
import type { YearMonth } from "@/lib/format/year-month";
import { Skeleton } from "@/components/ui/skeleton";

interface IncomeSectionProps {
  budgetId: string;
  yearMonth: YearMonth;
}

export function IncomeSection({ budgetId, yearMonth }: IncomeSectionProps) {
  const { data: entries, isLoading } = useIncome(budgetId, yearMonth);
  const [editing, setEditing] = useState<IncomeEntry | null>(null);
  const [deleting, setDeleting] = useState<IncomeEntry | null>(null);
  const deleteMutation = useDeleteIncome();

  const handleDelete = async () => {
    if (!deleting) return;
    await deleteMutation.mutateAsync({ id: deleting.id, budgetId });
    setDeleting(null);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-base font-medium text-muted-foreground">
            Income
          </CardTitle>
          <IncomeFormDialog
            budgetId={budgetId}
            yearMonth={yearMonth}
            trigger={
              <Button size="sm" variant="outline">
                <Plus className="mr-1 h-4 w-4" />
                Add income
              </Button>
            }
          />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : !entries || entries.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No income logged this month.
            </p>
          ) : (
            <ul className="divide-y">
              {entries.map((entry) => (
                <IncomeRow
                  key={entry.id}
                  entry={entry}
                  onEdit={() => setEditing(entry)}
                  onDelete={() => setDeleting(entry)}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Edit dialog rendered controlled-style by the section */}
      {editing && (
        <IncomeFormDialog
          budgetId={budgetId}
          yearMonth={yearMonth}
          existing={editing}
          open={true}
          onOpenChange={(o) => !o && setEditing(null)}
        />
      )}

      <DeleteConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete income entry?"
        description={
          deleting
            ? `This will remove the "${deleting.source}" entry. This cannot be undone.`
            : ""
        }
        onConfirm={handleDelete}
        isPending={deleteMutation.isPending}
      />
    </>
  );
}

function IncomeRow({
  entry,
  onEdit,
  onDelete,
}: {
  entry: IncomeEntry;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="group flex items-center justify-between gap-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{entry.source}</p>
        <p className="text-xs text-muted-foreground tabular-nums">
          {entry.date}
          {entry.notes ? ` · ${entry.notes}` : ""}
        </p>
      </div>
      <p className="font-medium tabular-nums">
        {Number(entry.amount).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </p>
      <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 [@media(hover:none)]:opacity-100">
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 sm:h-8 sm:w-8"
          onClick={onEdit}
          aria-label="Edit income"
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 sm:h-8 sm:w-8 text-destructive"
          onClick={onDelete}
          aria-label="Delete income"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </li>
  );
}