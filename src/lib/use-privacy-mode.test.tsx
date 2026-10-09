import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { initPrivacyMode, usePrivacyMode } from "./use-privacy-mode";

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-privacy");
});

describe("usePrivacyMode", () => {
  it("starts visible", () => {
    const { result } = renderHook(() => usePrivacyMode());
    expect(result.current.hidden).toBe(false);
  });

  it("toggles on and off, marking the page for the blur styles and remembering the choice", () => {
    const { result } = renderHook(() => usePrivacyMode());

    act(() => result.current.toggle());
    expect(result.current.hidden).toBe(true);
    expect(document.documentElement).toHaveAttribute("data-privacy", "on");
    expect(localStorage.getItem("hisaab:privacy-mode")).toBe("1");

    act(() => result.current.toggle());
    expect(result.current.hidden).toBe(false);
    expect(document.documentElement).not.toHaveAttribute("data-privacy");
  });

  it("restores a saved choice at startup", () => {
    localStorage.setItem("hisaab:privacy-mode", "1");
    initPrivacyMode();
    expect(document.documentElement).toHaveAttribute("data-privacy", "on");
    expect(renderHook(() => usePrivacyMode()).result.current.hidden).toBe(true);
  });

  it("keeps separate hook users in sync", () => {
    const a = renderHook(() => usePrivacyMode());
    const b = renderHook(() => usePrivacyMode());
    act(() => a.result.current.toggle());
    expect(b.result.current.hidden).toBe(true);
  });
});
