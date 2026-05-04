// 404 fallback for unmatched routes.
export function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-muted-foreground">Page not found.</p>
    </div>
  );
}