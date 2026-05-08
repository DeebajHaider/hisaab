import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSavings, type SavingsEntry } from "@/queries/use-savings";
import { useDeleteSavings } from "@/queries/use-savings-mutations";
import { SavingsFormDialog } from "./savings-form-dialog";
import { DeleteConfirmDialog } from "./delete-confirm-dialog";
import type { YearMonth } from "@/lib/format/year-month";
import { Skeleton } from "@/components/ui/skeleton";

interface SavingsSectionProps {
  budgetId: string;
  yearMonth: YearMonth;
}

export function SavingsSection({ budgetId, yearMonth }: SavingsSectionProps) {
  const { data: entries, isLoading } = useSavings(budgetId, yearMonth);
  const [editing, setEditing] = useState<SavingsEntry | null>(null);
  const [deleting, setDeleting] = useState<SavingsEntry | null>(null);
  const deleteMutation = useDeleteSavings();

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
            Savings allocations
          </CardTitle>
          <SavingsFormDialog
            budgetId={budgetId}
            yearMonth={yearMonth}
            trigger={
              <Button size="sm" variant="outline">
                <Plus className="mr-1 h-4 w-4" />
                Add savings
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
              No savings allocated this month.
            </p>
          ) : (
            <ul className="divide-y">
              {entries.map((entry) => (
                <SavingsRow
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

      {editing && (
        <SavingsFormDialog
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
        title="Delete savings allocation?"
        description={
          deleting
            ? `This will remove the "${deleting.name}" allocation. This cannot be undone.`
            : ""
        }
        onConfirm={handleDelete}
        isPending={deleteMutation.isPending}
      />
    </>
  );
}

function SavingsRow({
  entry,
  onEdit,
  onDelete,
}: {
  entry: SavingsEntry;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <li className="group flex items-center justify-between gap-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{entry.name}</p>
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
      <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onEdit}
          aria-label="Edit savings"
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive"
          onClick={onDelete}
          aria-label="Delete savings"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </li>
  );
}