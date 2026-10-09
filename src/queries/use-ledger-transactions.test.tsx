import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useLedgerTransactions } from "./use-ledger-transactions";

const calls = vi.hoisted(() => ({
  log: [] as [string, ...unknown[]][],
  rowsByBudget: {} as Record<string, unknown[]>,
  gate: null as Promise<void> | null,
}));

vi.mock("@/lib/supabase", () => {
  // A chainable stand-in for the PostgREST builder that records each call.
  const builder: Record<string, unknown> = {};
  let budget = "";
  for (const name of ["select", "eq", "gte", "lte", "in", "ilike", "overlaps", "order"]) {
    builder[name] = (...args: unknown[]) => {
      calls.log.push([name, ...args]);
      if (name === "eq" && args[0] === "budget_id") budget = args[1] as string;
      return builder;
    };
  }
  builder.limit = async () => {
    const rows = calls.rowsByBudget[budget] ?? [];
    await calls.gate;
    return { data: rows, error: null };
  };
  return { supabase: { from: () => builder } };
});

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const base = { from: "2026-07-01", to: "2027-06-30", categoryIds: [], itemIds: [], personIds: [], search: "" };
const used = (name: string) => calls.log.filter(([n]) => n === name);

beforeEach(() => {
  calls.log = [];
  calls.rowsByBudget = {};
  calls.gate = null;
});

describe("useLedgerTransactions filters", () => {
  it("applies no person or notes filter by default", async () => {
    const { result } = renderHook(() => useLedgerTransactions("b1", base), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(used("in")).toHaveLength(0);
    expect(used("ilike")).toHaveLength(0);
  });

  it("filters by person ids", async () => {
    const { result } = renderHook(
      () => useLedgerTransactions("b1", { ...base, personIds: ["p1", "p2"] }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(used("in")).toEqual([["in", "person_id", ["p1", "p2"]]]);
  });

  it("searches notes case-insensitively, taking wildcards literally", async () => {
    const { result } = renderHook(
      () => useLedgerTransactions("b1", { ...base, search: " 50% off " }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(used("ilike")).toEqual([["ilike", "notes", "%50\\% off%"]]);
  });

  it("filters to transactions carrying any of the chosen tags", async () => {
    const { result } = renderHook(
      () => useLedgerTransactions("b1", { ...base, tags: ["trip", "gift"] }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(used("overlaps")).toEqual([["overlaps", "tags", ["trip", "gift"]]]);
  });

  it("applies no tag filter by default", async () => {
    const { result } = renderHook(() => useLedgerTransactions("b1", base), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(used("overlaps")).toHaveLength(0);
  });

  it("ignores a blank search", async () => {
    const { result } = renderHook(
      () => useLedgerTransactions("b1", { ...base, search: "   " }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(used("ilike")).toHaveLength(0);
  });
});

describe("useLedgerTransactions while a changed query loads", () => {
  it("keeps the previous rows when only a filter changes within the same budget", async () => {
    calls.rowsByBudget = { b1: [{ id: "a" }] };
    const { result, rerender } = renderHook(
      ({ search }) => useLedgerTransactions("b1", { ...base, search }),
      { wrapper, initialProps: { search: "" } },
    );
    await waitFor(() => expect(result.current.data).toHaveLength(1));

    let release!: () => void;
    calls.gate = new Promise<void>((r) => (release = r));
    rerender({ search: "chai" });

    expect(result.current.isPlaceholderData).toBe(true);
    expect(result.current.data).toEqual([{ id: "a" }]);
    release();
    await waitFor(() => expect(result.current.isPlaceholderData).toBe(false));
  });

  it("never shows another budget's rows while a different budget loads", async () => {
    calls.rowsByBudget = { b1: [{ id: "from-b1" }], b2: [{ id: "from-b2" }] };
    const { result, rerender } = renderHook(
      ({ budgetId }) => useLedgerTransactions(budgetId, base),
      { wrapper, initialProps: { budgetId: "b1" } },
    );
    await waitFor(() => expect(result.current.data).toEqual([{ id: "from-b1" }]));

    let release!: () => void;
    calls.gate = new Promise<void>((r) => (release = r));
    rerender({ budgetId: "b2" });

    expect(result.current.data).toBeUndefined();
    release();
    await waitFor(() => expect(result.current.data).toEqual([{ id: "from-b2" }]));
  });
});
