interface ErrorBannerProps {
  /** What failed to load, e.g. "transactions", "categories". */
  context: string;
  error: unknown;
}

/**
 * Shown when a query errors. Without this, routes that only branch on
 * `isLoading` render the same empty state for "no data" and "failed to
 * fetch" — a failed request looks identical to an empty day/budget, with
 * no indication anything went wrong.
 */
export function ErrorBanner({ context, error }: ErrorBannerProps) {
  const message = error instanceof Error ? error.message : "Unknown error.";
  return (
    <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-6">
      <p className="font-medium">Couldn't load {context}</p>
      <p className="text-sm text-muted-foreground mt-1">{message}</p>
    </div>
  );
}
