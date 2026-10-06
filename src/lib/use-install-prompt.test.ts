import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useInstallPrompt } from "./use-install-prompt";

function fireInstallPrompt(outcome: "accepted" | "dismissed" = "accepted") {
  const event = new Event("beforeinstallprompt", { cancelable: true }) as Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: string }>;
  };
  event.prompt = vi.fn().mockResolvedValue(undefined);
  event.userChoice = Promise.resolve({ outcome });
  act(() => {
    window.dispatchEvent(event);
  });
  return event;
}

describe("useInstallPrompt", () => {
  it("cannot install until the browser says it can", () => {
    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.canInstall).toBe(false);
  });

  it("holds the browser's prompt, then shows it once and stops offering", async () => {
    const { result } = renderHook(() => useInstallPrompt());
    const event = fireInstallPrompt();

    expect(event.defaultPrevented).toBe(true);
    expect(result.current.canInstall).toBe(true);

    await act(async () => {
      await result.current.install();
    });
    expect(event.prompt).toHaveBeenCalledTimes(1);
    expect(result.current.canInstall).toBe(false);
  });

  it("stops offering once the app is installed", () => {
    const { result } = renderHook(() => useInstallPrompt());
    fireInstallPrompt();
    expect(result.current.canInstall).toBe(true);

    act(() => {
      window.dispatchEvent(new Event("appinstalled"));
    });
    expect(result.current.canInstall).toBe(false);
  });
});
