import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useInView } from "./use-in-view";

let trigger: (isIntersecting: boolean) => void;
const disconnect = vi.fn();

function Probe() {
  const [ref, seen] = useInView<HTMLDivElement>();
  return <div ref={ref} data-testid="probe" data-seen={String(seen)} />;
}

beforeEach(() => {
  disconnect.mockReset();
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(cb: (entries: { isIntersecting: boolean }[]) => void) {
        trigger = (isIntersecting) => cb([{ isIntersecting }]);
      }
      observe() {}
      disconnect = disconnect;
    },
  );
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
});
afterEach(() => vi.unstubAllGlobals());

describe("useInView", () => {
  it("starts unseen and flips once the element intersects, then stops observing", () => {
    render(<Probe />);
    expect(screen.getByTestId("probe")).toHaveAttribute("data-seen", "false");

    act(() => trigger(false));
    expect(screen.getByTestId("probe")).toHaveAttribute("data-seen", "false");

    act(() => trigger(true));
    expect(screen.getByTestId("probe")).toHaveAttribute("data-seen", "true");
    expect(disconnect).toHaveBeenCalled();
  });

  it("is immediately seen when the user prefers reduced motion", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    render(<Probe />);
    expect(screen.getByTestId("probe")).toHaveAttribute("data-seen", "true");
  });

  it("is immediately seen where IntersectionObserver does not exist", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    render(<Probe />);
    expect(screen.getByTestId("probe")).toHaveAttribute("data-seen", "true");
  });
});
