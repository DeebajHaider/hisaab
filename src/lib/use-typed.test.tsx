import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTyped } from "./use-typed";

function Probe({ start }: { start: boolean }) {
  return <span data-testid="t">{useTyped("flou", start, 100, 200)}</span>;
}
const text = () => screen.getByTestId("t").textContent;

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("useTyped", () => {
  it("shows nothing until started", () => {
    render(<Probe start={false} />);
    act(() => void vi.advanceTimersByTime(2000));
    expect(text()).toBe("");
  });

  it("types one character at a time after the delay and stops at the end", () => {
    render(<Probe start />);
    act(() => void vi.advanceTimersByTime(150));
    expect(text()).toBe("");
    act(() => void vi.advanceTimersByTime(150)); // first char lands at 300ms
    expect(text()).toBe("f");
    act(() => void vi.advanceTimersByTime(200));
    expect(text()).toBe("flo");
    act(() => void vi.advanceTimersByTime(5000));
    expect(text()).toBe("flou");
  });

  it("shows the full text immediately under reduced motion", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    render(<Probe start={false} />);
    expect(text()).toBe("flou");
  });
});
