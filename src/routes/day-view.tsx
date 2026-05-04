import { useParams } from "react-router-dom";

export function DayView() {
  const { date } = useParams<{ date: string }>();
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
      <h1 className="text-xl font-semibold tracking-tight">Day view</h1>
      <p className="text-sm text-muted-foreground mt-1">
        Showing {date}. (Entry form and transaction list coming soon.)
      </p>
    </div>
  );
}