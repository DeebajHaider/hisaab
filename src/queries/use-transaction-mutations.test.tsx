import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCopyTransactions, useDeleteTransaction } from "./use-transaction-mutations";
import type { Transaction } from "./use-transactions";

const db = vi.hoisted(() => ({
  deleteEq: vi.fn(),
  deleteIn: vi.fn(),
  insert: vi.fn(),
}));
const toastMock = vi.hoisted(() =>
  Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
);

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: () => ({
      delete: () => ({ eq: db.deleteEq, in: db.deleteIn }),
      insert: db.insert,
    }),
  },
}));
vi.mock("sonner", () => ({ toast: toastMock }));

const row: Transaction = {
  id: "tx-1",
  budget_id: "b1",
  category_id: "cat-1",
  item_id: "item-1",
  date: "2026-10-02",
  amount: 4250,
  rate: 170,
  qty: 25,
  person_id: null,
  notes: "Petrol",
  created_by: "u1",
  created_at: "2026-10-02T10:00:00Z",
} as Transaction;

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  vi.clearAllMocks();
  db.deleteEq.mockResolvedValue({ error: null });
  db.insert.mockResolvedValue({ error: null });
  db.deleteIn.mockResolvedValue({ error: null });
});

describe("useDeleteTransaction undo", () => {
  it("offers Undo, and Undo re-inserts the same row", async () => {
    const { result } = renderHook(() => useDeleteTransaction(), { wrapper });
    result.current.mutate({ id: "tx-1", budgetId: "b1", snapshot: row });

    await waitFor(() => expect(toastMock).toHaveBeenCalled());
    const [message, options] = toastMock.mock.calls[0];
    expect(message).toBe("Transaction deleted.");
    expect(options.action.label).toBe("Undo");
    expect(db.insert).not.toHaveBeenCalled();

    options.action.onClick();

    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith("Transaction restored."));
    expect(db.insert).toHaveBeenCalledWith({
      id: "tx-1",
      budget_id: "b1",
      category_id: "cat-1",
      item_id: "item-1",
      date: "2026-10-02",
      amount: 4250,
      rate: 170,
      qty: 25,
      person_id: null,
      notes: "Petrol",
    });
  });

  it("shows a plain success toast with no Undo when no snapshot is given", async () => {
    const { result } = renderHook(() => useDeleteTransaction(), { wrapper });
    result.current.mutate({ id: "tx-1", budgetId: "b1" });

    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith("Transaction deleted."));
    expect(toastMock).not.toHaveBeenCalled();
  });

  it("reports a failed restore instead of claiming success", async () => {
    db.insert.mockResolvedValue({ error: new Error("duplicate key") });
    const { result } = renderHook(() => useDeleteTransaction(), { wrapper });
    result.current.mutate({ id: "tx-1", budgetId: "b1", snapshot: row });

    await waitFor(() => expect(toastMock).toHaveBeenCalled());
    toastMock.mock.calls[0][1].action.onClick();

    await waitFor(() =>
      expect(toastMock.error).toHaveBeenCalledWith(
        "Couldn't restore transaction.",
        expect.objectContaining({ description: "duplicate key" }),
      ),
    );
    expect(toastMock.success).not.toHaveBeenCalledWith("Transaction restored.");
  });
});

describe("useCopyTransactions", () => {
  const rows = [
    { id: "n1", budget_id: "b1", item_id: "i1", category_id: "c1", date: "2026-10-03", amount: 100 },
    { id: "n2", budget_id: "b1", item_id: "i2", category_id: "c1", date: "2026-10-03", amount: 250 },
  ];

  it("inserts all rows in one request and offers Undo", async () => {
    const { result } = renderHook(() => useCopyTransactions(), { wrapper });
    result.current.mutate({ budgetId: "b1", rows });

    await waitFor(() => expect(toastMock).toHaveBeenCalled());
    expect(db.insert).toHaveBeenCalledTimes(1);
    expect(db.insert).toHaveBeenCalledWith(rows);
    expect(toastMock.mock.calls[0][0]).toBe("Copied 2 transactions.");
  });

  it("Undo deletes exactly the copied rows", async () => {
    const { result } = renderHook(() => useCopyTransactions(), { wrapper });
    result.current.mutate({ budgetId: "b1", rows });

    await waitFor(() => expect(toastMock).toHaveBeenCalled());
    toastMock.mock.calls[0][1].action.onClick();

    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith("Copy undone."));
    expect(db.deleteIn).toHaveBeenCalledWith("id", ["n1", "n2"]);
  });

  it("reports an insert failure and offers no Undo", async () => {
    db.insert.mockResolvedValue({ error: new Error("permission denied") });
    const { result } = renderHook(() => useCopyTransactions(), { wrapper });
    result.current.mutate({ budgetId: "b1", rows });

    await waitFor(() =>
      expect(toastMock.error).toHaveBeenCalledWith(
        "Couldn't copy transactions.",
        expect.objectContaining({ description: "permission denied" }),
      ),
    );
    expect(toastMock).not.toHaveBeenCalled();
  });
});
