import { CircleCheck, CircleAlert, Circle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildRecap } from "@/lib/calculations/month-recap";
import type { TransactionWithRelations } from "@/queries/use-transactions";

/** A few plain-language takeaways about the month, against the same stretch of last month. */
export function MonthRecapCard({
  current,
  previous,
  daysElapsed,
  totalDays,
  currency,
}: {
  current: TransactionWithRelations[];
  previous: TransactionWithRelations[];
  daysElapsed: number;
  totalDays: number;
  currency: string;
}) {
  const lines = buildRecap({
    current,
    previous,
    daysElapsed,
    totalDays,
    format: (n) =>
      `${currency} ${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
  });
  if (lines.length === 0) return null;

  const icon = {
    good: <CircleCheck className="h-4 w-4 shrink-0 text-accent-text" aria-label="Good" />,
    bad: <CircleAlert className="h-4 w-4 shrink-0 text-amber-500" aria-label="Worth a look" />,
    neutral: <Circle className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />,
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-medium text-muted-foreground">Recap</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2.5">
          {lines.map((line) => (
            <li key={line.text} className="flex items-start gap-2.5 text-sm">
              <span className="mt-0.5">{icon[line.tone]}</span>
              <span>{line.text}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
