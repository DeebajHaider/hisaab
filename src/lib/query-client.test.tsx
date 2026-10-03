import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider, onlineManager, useMutation } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { queryClient } from "./query-client";

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

afterEach(() => {
  act(() => onlineManager.setOnline(true));
});

describe("app query client while offline", () => {
  it("holds a save until the connection returns, then runs it", async () => {
    const save = vi.fn().mockResolvedValue("ok");
    act(() => onlineManager.setOnline(false));

    const { result } = renderHook(() => useMutation({ mutationFn: save }), { wrapper });
    act(() => result.current.mutate("row"));

    await waitFor(() => expect(result.current.isPaused).toBe(true));
    expect(save).not.toHaveBeenCalled();

    act(() => onlineManager.setOnline(true));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(save).toHaveBeenCalledTimes(1);
  });
});
