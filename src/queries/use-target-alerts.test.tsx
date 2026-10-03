import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { useTargetAlerts } from "./use-target-alerts";

const target = (id: string, amount: number, start = "2026-10-01", end = "2026-10-31") => ({
  id,
  name: `T${id}`,
  target_amount: amount,
  start_date: start,
  end_date: end,
});
const SPENT: Record<string, number> = { a: 900, b: 100, c: 5000, d: 2000 };

vi.mock("./use-targets", () => ({
  useTargets: () => ({
    data: [
      target("a", 1000),
      target("b", 1000),
      target("c", 1000, "2026-09-01", "2026-09-30"),
      target("d", 1000),
    ],
  }),
}));
vi.mock("./use-target-spent", () => ({
  targetSpentQuery: (_budgetId: string, t: { id: string }) => ({
    queryKey: ["target-spent", t.id],
    queryFn: async () => SPENT[t.id],
  }),
}));

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("useTargetAlerts", () => {
  it("returns running targets at 80%+, most overspent first, once their spend has loaded", async () => {
    const { result } = renderHook(() => useTargetAlerts("b1", "2026-10-15"), { wrapper });

    expect(result.current).toEqual([]);
    await waitFor(() => expect(result.current).toHaveLength(2));

    expect(result.current.map((a) => a.target.id)).toEqual(["d", "a"]);
    expect(result.current.map((a) => a.status)).toEqual(["over", "near"]);
  });
});
