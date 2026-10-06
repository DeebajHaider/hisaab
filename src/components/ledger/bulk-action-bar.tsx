import { useId, useState } from "react";
import { Trash2, UserRound, ArrowRightLeft, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DeleteConfirmDialog } from "@/components/transactions/delete-confirm-dialog";
import {
  useBulkDeleteTransactions,
  useBulkUpdateTransactions,
} from "@/queries/use-bulk-transaction-mutations";
import { planMove, planSetPerson } from "@/lib/calculations/bulk-edit";
import type { TransactionWithRelations } from "@/queries/use-transactions";
import type { ItemWithCategory } from "@/queries/use-items";
import type { Person } from "@/queries/use-people";

interface BulkActionBarProps {
  budgetId: string;
  rows: TransactionWithRelations[];
  items: ItemWithCategory[];
  people: Person[];
  onClear: () => void;
}

type Dialogs = "move" | "person" | "delete" | null;

/** Floating bar for acting on the selected Ledger rows. */
export function BulkActionBar({ budgetId, rows, items, people, onClear }: BulkActionBarProps) {
  const [dialog, setDialog] = useState<Dialogs>(null);
  const update = useBulkUpdateTransactions();
  const remove = useBulkDeleteTransactions();
  const count = rows.length;

  const canSetPerson = people.length > 0 && rows.every((r) => r.category?.tracks_person);

  return (
    <>
      <div
        role="toolbar"
        aria-label="Bulk actions"
        className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] z-40 mx-auto flex max-w-xl flex-wrap items-center gap-2 rounded-xl glass px-3 py-2 shadow-lg md:bottom-6"
      >
        <span className="mr-auto text-sm font-medium tabular-nums">{count} selected</span>
        <Button size="sm" variant="outline" onClick={() => setDialog("move")} disabled={count === 0}>
          <ArrowRightLeft className="mr-1.5 h-4 w-4" />
          Move
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setDialog("person")}
          disabled={!canSetPerson}
          title={canSetPerson ? undefined : "Needs transactions in categories that track people"}
        >
          <UserRound className="mr-1.5 h-4 w-4" />
          Person
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-destructive"
          onClick={() => setDialog("delete")}
          disabled={count === 0}
        >
          <Trash2 className="mr-1.5 h-4 w-4" />
          Delete
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onClear} aria-label="Clear selection">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {dialog === "move" && (
        <MoveDialog
          rows={rows}
          items={items}
          people={people}
          pending={update.isPending}
          onClose={() => setDialog(null)}
          onApply={(patch) =>
            update.mutate(
              { budgetId, rows, patch },
              {
                onSuccess: () => {
                  setDialog(null);
                  onClear();
                },
              },
            )
          }
        />
      )}

      {dialog === "person" && (
        <PersonDialog
          rows={rows}
          people={people}
          pending={update.isPending}
          onClose={() => setDialog(null)}
          onApply={(patch) =>
            update.mutate(
              { budgetId, rows, patch },
              {
                onSuccess: () => {
                  setDialog(null);
                  onClear();
                },
              },
            )
          }
        />
      )}

      <DeleteConfirmDialog
        open={dialog === "delete"}
        onOpenChange={(open) => !open && setDialog(null)}
        title={`Delete ${count} transaction${count === 1 ? "" : "s"}?`}
        description="They'll be removed from your history. You can undo right afterwards."
        isPending={remove.isPending}
        onConfirm={() =>
          remove.mutate(
            { budgetId, rows },
            {
              onSuccess: () => {
                setDialog(null);
                onClear();
              },
            },
          )
        }
      />
    </>
  );
}

function MoveDialog({
  rows,
  items,
  people,
  pending,
  onClose,
  onApply,
}: {
  rows: TransactionWithRelations[];
  items: ItemWithCategory[];
  people: Person[];
  pending: boolean;
  onClose: () => void;
  onApply: (patch: NonNullable<ReturnType<typeof planMove> & { ok: true }>["patch"]) => void;
}) {
  const uid = useId();
  const [itemId, setItemId] = useState("");
  const [personId, setPersonId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const target = items.find((i) => i.id === itemId);
  const tracksPerson = !!target?.category?.tracks_person;
  const needsPerson = tracksPerson && rows.some((r) => !r.person_id);

  const submit = () => {
    if (!target || !target.category) return;
    const plan = planMove(
      rows,
      { itemId: target.id, categoryId: target.category.id, tracksPerson },
      personId || null,
    );
    if (!plan.ok) {
      setError(plan.reason);
      return;
    }
    onApply(plan.patch);
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Move {rows.length} transaction{rows.length === 1 ? "" : "s"}</DialogTitle>
          <DialogDescription>
            Pick the item they should belong to. The category follows the item.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`${uid}-item`}>New item</Label>
            <Select
              value={itemId}
              onValueChange={(v) => {
                setItemId(v);
                setError(null);
              }}
            >
              <SelectTrigger id={`${uid}-item`}>
                <SelectValue placeholder="Pick an item" />
              </SelectTrigger>
              <SelectContent>
                {items.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.category?.name ? `${item.category.name} · ` : ""}
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {tracksPerson && (
            <div className="space-y-2">
              <Label htmlFor={`${uid}-person`}>
                Person{needsPerson ? "" : " (optional, otherwise each keeps theirs)"}
              </Label>
              <Select
                value={personId}
                onValueChange={(v) => {
                  setPersonId(v);
                  setError(null);
                }}
              >
                <SelectTrigger id={`${uid}-person`}>
                  <SelectValue placeholder="Pick a person" />
                </SelectTrigger>
                <SelectContent>
                  {people
                    .filter((p) => !p.is_archived)
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button
            className="bg-accent-solid hover:bg-accent-solid-hover text-white"
            onClick={submit}
            disabled={!target || pending}
          >
            {pending ? "Moving..." : "Move"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PersonDialog({
  rows,
  people,
  pending,
  onClose,
  onApply,
}: {
  rows: TransactionWithRelations[];
  people: Person[];
  pending: boolean;
  onClose: () => void;
  onApply: (patch: { person_id?: string | null }) => void;
}) {
  const uid = useId();
  const [personId, setPersonId] = useState("");

  const submit = () => {
    const plan = planSetPerson(rows, personId);
    if (plan.ok) onApply(plan.patch);
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Set person for {rows.length} transaction{rows.length === 1 ? "" : "s"}</DialogTitle>
          <DialogDescription>Everyone selected will be assigned to this person.</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor={`${uid}-person`}>Person</Label>
          <Select value={personId} onValueChange={setPersonId}>
            <SelectTrigger id={`${uid}-person`}>
              <SelectValue placeholder="Pick a person" />
            </SelectTrigger>
            <SelectContent>
              {people
                .filter((p) => !p.is_archived)
                .map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button
            className="bg-accent-solid hover:bg-accent-solid-hover text-white"
            onClick={submit}
            disabled={!personId || pending}
          >
            {pending ? "Saving..." : "Set person"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
