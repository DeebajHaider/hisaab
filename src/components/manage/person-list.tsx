import { useState } from "react";
import { Plus, Pencil, Archive, ArchiveRestore } from "lucide-react";
import { usePeople, type Person } from "@/queries/use-people";
import { useArchivePerson } from "@/queries/use-people-mutations";
import { PersonFormDialog } from "./person-form-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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

interface PersonListProps {
  budgetId: string;
}

/**
 * People management section for the Manage page.
 * Lists active people with edit/archive actions, plus an expandable
 * archived section. Mirrors the structural patterns of CategoryTree
 * but flatter, since people don't nest.
 */
export function PersonList({ budgetId }: PersonListProps) {
  // Fetch active + archived in one query so the "show archived" toggle
  // doesn't trigger a refetch round-trip. Slightly more data, but at
  // family scale (handful of people total) negligible.
  const peopleQuery = usePeople(budgetId, { includeArchived: true });
  const [showArchived, setShowArchived] = useState(false);

  const all = peopleQuery.data ?? [];
  const active = all.filter((p) => !p.is_archived);
  const archived = all.filter((p) => p.is_archived);

  return (
    <section className="mt-10">
      <SectionHeader budgetId={budgetId} count={active.length} />

      {peopleQuery.isLoading ? (
        <ListSkeleton />
      ) : active.length === 0 && archived.length === 0 ? (
        <EmptyState budgetId={budgetId} />
      ) : (
        <div className="space-y-2">
          {active.map((person) => (
            <PersonRow key={person.id} person={person} budgetId={budgetId} />
          ))}

          {archived.length > 0 && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowArchived((v) => !v)}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                {showArchived ? "Hide" : "Show"} archived ({archived.length})
              </button>

              {showArchived && (
                <div className="space-y-2 mt-2">
                  {archived.map((person) => (
                    <PersonRow
                      key={person.id}
                      person={person}
                      budgetId={budgetId}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

// ----------------------------------------------------------------------------
// Section header — title, subtitle, add button
// ----------------------------------------------------------------------------
function SectionHeader({
  budgetId,
  count,
}: {
  budgetId: string;
  count: number;
}) {
  return (
    <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">People</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-xl">
          Names for per-person attribution in tracked categories (e.g.,
          Pocket Money, School Fees). Separate from budget members.
        </p>
      </div>
      {count > 0 && (
        <PersonFormDialog
          budgetId={budgetId}
          trigger={
            <Button
              size="sm"
              className="bg-accent-solid hover:bg-accent-solid-hover text-white"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              New person
            </Button>
          }
        />
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Single row — name + edit + archive/unarchive buttons
// ----------------------------------------------------------------------------
function PersonRow({
  person,
  budgetId,
}: {
  person: Person;
  budgetId: string;
}) {
  const archive = useArchivePerson();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleArchiveToggle = async () => {
    // Archiving is destructive-ish — needs confirmation. Unarchiving is safe.
    if (!person.is_archived) {
      setConfirmOpen(true);
      return;
    }
    await archive.mutateAsync({
      id: person.id,
      budgetId,
      archived: false,
    });
  };

  const handleConfirmArchive = async () => {
    await archive.mutateAsync({
      id: person.id,
      budgetId,
      archived: true,
    });
    setConfirmOpen(false);
  };

  return (
    <div
      className={`flex items-center gap-3 rounded-md border border-border/60 px-3 py-2.5 ${
        person.is_archived ? "opacity-60" : ""
      }`}
    >
      <span className="flex-1 text-sm font-medium truncate">
        {person.name}
        {person.is_archived && (
          <span className="text-xs text-muted-foreground ml-2 font-normal">
            (archived)
          </span>
        )}
      </span>

      <div className="flex items-center gap-1 shrink-0">
        {!person.is_archived && (
          <PersonFormDialog
            budgetId={budgetId}
            existing={person}
            trigger={
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                aria-label={`Edit ${person.name}`}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            }
          />
        )}
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={handleArchiveToggle}
          disabled={archive.isPending}
          aria-label={
            person.is_archived ? `Unarchive ${person.name}` : `Archive ${person.name}`
          }
          title={person.is_archived ? "Unarchive" : "Archive"}
        >
          {person.is_archived ? (
            <ArchiveRestore className="h-4 w-4" />
          ) : (
            <Archive className="h-4 w-4" />
          )}
        </Button>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive {person.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              They'll be hidden from new transaction entry, but existing
              transactions tagged to them will keep the attribution.
              You can unarchive any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={archive.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmArchive}
              disabled={archive.isPending}
            >
              {archive.isPending ? "Archiving..." : "Archive"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Empty state — shown only when there are no active AND no archived people
// ----------------------------------------------------------------------------
function EmptyState({ budgetId }: { budgetId: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border p-8 text-center">
      <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
        No people added yet. Add one to start attributing transactions in
        tracked categories.
      </p>
      <PersonFormDialog
        budgetId={budgetId}
        trigger={
          <Button
            size="sm"
            className="bg-accent-solid hover:bg-accent-solid-hover text-white"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add person
          </Button>
        }
      />
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-2">
      {[0, 1].map((i) => (
        <div
          key={i}
          className="rounded-md border border-border/60 px-3 py-2.5 flex items-center gap-3"
        >
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-8 w-8 ml-auto" />
          <Skeleton className="h-8 w-8" />
        </div>
      ))}
    </div>
  );
}

