import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCountUp } from "./use-count-up";

function Probe({ start }: { start: boolean }) {
  return <span data-testid="n">{useCountUp(1000, start, 1000, 100)}</span>;
}
const value = () => Number(screen.getByTestId("n").textContent);

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("useCountUp", () => {
  it("stays at 0 until started", () => {
    render(<Probe start={false} />);
    act(() => void vi.advanceTimersByTime(3000));
    expect(value()).toBe(0);
  });

  it("counts up after the delay and lands exactly on the target", () => {
    render(<Probe start />);
    act(() => void vi.advanceTimersByTime(50));
    expect(value()).toBe(0);

    act(() => void vi.advanceTimersByTime(600));
    expect(value()).toBeGreaterThan(0);
    expect(value()).toBeLessThan(1000);

    act(() => void vi.advanceTimersByTime(1500));
    expect(value()).toBe(1000);
  });

  it("shows the final value straight away under reduced motion", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    render(<Probe start={false} />);
    expect(value()).toBe(1000);
  });
});
