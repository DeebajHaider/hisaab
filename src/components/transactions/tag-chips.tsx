/** Read-only tags on a transaction row. Renders nothing when there are none. */
export function TagChips({ tags }: { tags: string[] | null | undefined }) {
  if (!tags || tags.length === 0) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {tags.map((tag) => (
        <span
          key={tag}
          className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] leading-none text-accent-soft-foreground"
        >
          {tag}
        </span>
      ))}
    </div>
  );
}
