export type StartStepId = "category" | "item" | "transaction";

export interface StartStep {
  id: StartStepId;
  label: string;
  done: boolean;
}

/** The first-run checklist for a budget, in the order things have to happen. */
export function getStartSteps(counts: {
  categories: number;
  items: number;
  hasTransaction: boolean;
}): StartStep[] {
  return [
    { id: "category", label: "Add a category, like Food or Car", done: counts.categories > 0 },
    { id: "item", label: "Add an item inside it, like Groceries", done: counts.items > 0 },
    { id: "transaction", label: "Log your first transaction", done: counts.hasTransaction },
  ];
}

/** Whether the checklist is worth showing: not finished yet. */
export function isStartIncomplete(steps: StartStep[]): boolean {
  return steps.some((s) => !s.done);
}
