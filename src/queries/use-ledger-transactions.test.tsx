import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useLedgerTransactions } from "./use-ledger-transactions";

const calls = vi.hoisted(() => ({ log: [] as [string, ...unknown[]][] }));

vi.mock("@/lib/supabase", () => {
  // A chainable stand-in for the PostgREST builder that records each call.
  const builder: Record<string, unknown> = {};
  for (const name of ["select", "eq", "gte", "lte", "in", "ilike", "order"]) {
    builder[name] = (...args: unknown[]) => {
      calls.log.push([name, ...args]);
      return builder;
    };
  }
  builder.limit = () => Promise.resolve({ data: [], error: null });
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

  it("ignores a blank search", async () => {
    const { result } = renderHook(
      () => useLedgerTransactions("b1", { ...base, search: "   " }),
      { wrapper },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(used("ilike")).toHaveLength(0);
  });
});
