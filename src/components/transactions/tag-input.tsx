import { useState, type KeyboardEvent } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addTag, MAX_TAG_LENGTH, MAX_TAGS, removeTag } from "@/lib/tags";

/** Free-form labels on a transaction. Enter or comma adds one; existing tags are offered as shortcuts. */
export function TagInput({
  id,
  value,
  onChange,
  suggestions,
}: {
  id: string;
  value: string[];
  onChange: (tags: string[]) => void;
  /** Tags already in use in this budget, most used first. */
  suggestions: string[];
}) {
  const [draft, setDraft] = useState("");

  const commit = () => {
    if (draft.trim()) onChange(addTag(value, draft));
    setDraft("");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      // Enter here must add the tag, not submit the transaction.
      e.preventDefault();
      commit();
    } else if (e.key === "Backspace" && draft === "" && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const unused = suggestions.filter((s) => !value.includes(s)).slice(0, 6);

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-xs">
        Tags (optional)
      </Label>
      <div className="flex flex-wrap items-center gap-1.5">
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-accent-soft py-0.5 pl-2.5 pr-1 text-xs text-accent-soft-foreground"
          >
            {tag}
            <button
              type="button"
              onClick={() => onChange(removeTag(value, tag))}
              aria-label={`Remove tag ${tag}`}
              className="rounded-full p-0.5 hover:bg-black/10 dark:hover:bg-white/10"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        {value.length < MAX_TAGS && (
          <Input
            id={id}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            onBlur={commit}
            maxLength={MAX_TAG_LENGTH}
            placeholder={value.length === 0 ? "e.g. trip, reimbursable" : "Add another"}
            autoComplete="off"
            className="h-7 w-44 text-xs"
          />
        )}
      </div>
      {unused.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          Used before:
          {unused.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => onChange(addTag(value, tag))}
              className="rounded-full border border-border px-2 py-0.5 transition-colors hover:bg-muted hover:text-foreground"
            >
              {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
