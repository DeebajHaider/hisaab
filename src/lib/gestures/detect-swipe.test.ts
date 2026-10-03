import { describe, expect, it } from "vitest";
import { detectSwipe } from "./detect-swipe";

const base = { startX: 200, startY: 400, viewportWidth: 390 };

describe("detectSwipe", () => {
  it("reads a clear leftward swipe as 'left' (finger moved left: go forward)", () => {
    expect(detectSwipe({ ...base, endX: 100, endY: 405 })).toBe("left");
  });

  it("reads a clear rightward swipe as 'right'", () => {
    expect(detectSwipe({ ...base, endX: 310, endY: 395 })).toBe("right");
  });

  it("ignores short movements (taps, jitter)", () => {
    expect(detectSwipe({ ...base, endX: 150, endY: 400 })).toBeNull();
    expect(detectSwipe({ ...base, endX: 201, endY: 400 })).toBeNull();
  });

  it("ignores mostly-vertical gestures, which are scrolling", () => {
    expect(detectSwipe({ ...base, endX: 110, endY: 600 })).toBeNull();
  });

  it("accepts a swipe that drifts a little vertically", () => {
    expect(detectSwipe({ ...base, endX: 100, endY: 450 })).toBe("left");
  });

  it("ignores swipes that begin at a screen edge (the browser's back gesture)", () => {
    expect(detectSwipe({ startX: 10, startY: 400, endX: 150, endY: 400, viewportWidth: 390 })).toBeNull();
    expect(detectSwipe({ startX: 385, startY: 400, endX: 240, endY: 400, viewportWidth: 390 })).toBeNull();
  });
});
