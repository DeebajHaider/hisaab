import { useState, type FormEvent } from "react";
import { Bookmark, BookmarkPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MAX_NAME_LENGTH, type SavedLedgerFilter } from "@/lib/saved-ledger-filters";

interface SavedFiltersProps {
  filters: SavedLedgerFilter[];
  /** Whether the current view differs from the default and is worth saving. */
  canSave: boolean;
  onApply: (filter: SavedLedgerFilter) => void;
  onSave: (name: string) => void;
  onDelete: (id: string) => void;
}

/** Named Ledger views: one click to reapply, plus saving the current one. */
export function SavedFilters({ filters, canSave, onApply, onSave, onDelete }: SavedFiltersProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  if (filters.length === 0 && !canSave) return null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave(name);
    setName("");
    setOpen(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Bookmark className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
      {filters.map((f) => (
        <span
          key={f.id}
          className="inline-flex items-center rounded-full border border-border text-xs"
        >
          <button
            type="button"
            onClick={() => onApply(f)}
            className="rounded-l-full py-1 pl-2.5 pr-1.5 transition-colors hover:bg-muted"
          >
            {f.name}
          </button>
          <button
            type="button"
            onClick={() => onDelete(f.id)}
            aria-label={`Delete saved filter ${f.name}`}
            className="rounded-r-full py-1 pl-0.5 pr-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}

      {canSave && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground">
              <BookmarkPlus className="mr-1 h-3.5 w-3.5" />
              Save this view
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64">
            <form onSubmit={submit} className="space-y-2">
              <label htmlFor="saved-filter-name" className="text-xs font-medium">
                Name this view
              </label>
              <Input
                id="saved-filter-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={MAX_NAME_LENGTH}
                placeholder="e.g. Groceries this year"
                autoComplete="off"
                autoFocus
              />
              <Button
                type="submit"
                size="sm"
                className="w-full bg-accent-solid hover:bg-accent-solid-hover text-white"
                disabled={!name.trim()}
              >
                Save
              </Button>
            </form>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
