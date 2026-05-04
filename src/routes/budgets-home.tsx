import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BudgetsHome() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Your budgets</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Pick a budget to log expenses, or create a new one.
          </p>
        </div>
        <Button className="bg-teal-600 hover:bg-teal-700 text-white" disabled>
          <Plus className="w-4 h-4 mr-2" />
          New budget
        </Button>
      </div>
      <div className="rounded-lg border border-dashed border-border p-12 text-center">
        <p className="text-muted-foreground">
          (Budget list will appear here once we wire up data fetching.)
        </p>
      </div>
    </div>
  );
}