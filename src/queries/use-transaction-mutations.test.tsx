import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDeleteTransaction } from "./use-transaction-mutations";
import type { Transaction } from "./use-transactions";

const db = vi.hoisted(() => ({
  deleteEq: vi.fn(),
  insert: vi.fn(),
}));
const toastMock = vi.hoisted(() =>
  Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
);

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: () => ({
      delete: () => ({ eq: db.deleteEq }),
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
