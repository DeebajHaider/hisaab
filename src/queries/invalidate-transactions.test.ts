import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { invalidateTransactionData } from "./invalidate-transactions";

describe("invalidateTransactionData", () => {
  it("refreshes lists, trends, and every target's progress for the budget", () => {
    const qc = new QueryClient();
    const spy = vi.spyOn(qc, "invalidateQueries");

    invalidateTransactionData(qc, "b1");

    const keys = spy.mock.calls.map(([filters]) => filters?.queryKey);
    expect(keys).toEqual([["transactions", "b1"], ["trends", "b1"], ["target-spent"]]);
  });

  it("actually marks cached target progress stale", () => {
    const qc = new QueryClient();
    qc.setQueryData(["target-spent", "t1"], 500);
    qc.setQueryData(["target-spent", "t2"], 900);

    invalidateTransactionData(qc, "b1");

    expect(qc.getQueryState(["target-spent", "t1"])?.isInvalidated).toBe(true);
    expect(qc.getQueryState(["target-spent", "t2"])?.isInvalidated).toBe(true);
  });
});
