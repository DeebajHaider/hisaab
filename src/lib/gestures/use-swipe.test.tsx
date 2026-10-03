import { createPortal } from "react-dom";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSwipe } from "./use-swipe";

const onSwipe = vi.fn();

function Surface({ enabled = true }: { enabled?: boolean }) {
  const { ref, ...handlers } = useSwipe(onSwipe, enabled);
  return (
    <div ref={ref} data-testid="surface" {...handlers}>
      <p data-testid="text">Some content</p>
      <input data-testid="field" />
      {createPortal(<button data-testid="portaled">in a dialog</button>, document.body)}
    </div>
  );
}

const swipe = (el: Element, from: [number, number], to: [number, number]) => {
  fireEvent.touchStart(el, { touches: [{ clientX: from[0], clientY: from[1] }] });
  fireEvent.touchEnd(el, { changedTouches: [{ clientX: to[0], clientY: to[1] }] });
};

beforeEach(() => {
  onSwipe.mockReset();
  Object.defineProperty(window, "innerWidth", { value: 390, configurable: true });
});

describe("useSwipe", () => {
  it("reports a horizontal swipe on the surface", () => {
    render(<Surface />);
    swipe(screen.getByTestId("text"), [250, 300], [100, 305]);
    expect(onSwipe).toHaveBeenCalledWith("left");

    swipe(screen.getByTestId("text"), [100, 300], [250, 295]);
    expect(onSwipe).toHaveBeenLastCalledWith("right");
  });

  it("ignores vertical scrolling", () => {
    render(<Surface />);
    swipe(screen.getByTestId("text"), [200, 200], [190, 500]);
    expect(onSwipe).not.toHaveBeenCalled();
  });

  it("ignores swipes that start in a form field", () => {
    render(<Surface />);
    swipe(screen.getByTestId("field"), [250, 300], [100, 300]);
    expect(onSwipe).not.toHaveBeenCalled();
  });

  it("ignores swipes inside a portaled dialog or menu", () => {
    render(<Surface />);
    swipe(screen.getByTestId("portaled"), [250, 300], [100, 300]);
    expect(onSwipe).not.toHaveBeenCalled();
  });

  it("ignores multi-finger gestures such as pinch", () => {
    render(<Surface />);
    const el = screen.getByTestId("text");
    fireEvent.touchStart(el, {
      touches: [{ clientX: 250, clientY: 300 }, { clientX: 300, clientY: 300 }],
    });
    fireEvent.touchEnd(el, { changedTouches: [{ clientX: 100, clientY: 300 }] });
    expect(onSwipe).not.toHaveBeenCalled();
  });

  it("does nothing while disabled", () => {
    render(<Surface enabled={false} />);
    swipe(screen.getByTestId("text"), [250, 300], [100, 300]);
    expect(onSwipe).not.toHaveBeenCalled();
  });
});
