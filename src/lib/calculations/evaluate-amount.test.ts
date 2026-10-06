import { describe, expect, it } from "vitest";
import { evaluateAmount, formatEvaluated, isExpression } from "./evaluate-amount";

describe("evaluateAmount", () => {
  it("reads plain numbers", () => {
    expect(evaluateAmount("4250")).toBe(4250);
    expect(evaluateAmount("12.5")).toBe(12.5);
    expect(evaluateAmount(".5")).toBe(0.5);
    expect(evaluateAmount(" 7 ")).toBe(7);
  });

  it("adds, subtracts, multiplies and divides", () => {
    expect(evaluateAmount("120+80")).toBe(200);
    expect(evaluateAmount("500-120.5")).toBe(379.5);
    expect(evaluateAmount("450*3")).toBe(1350);
    expect(evaluateAmount("900/4")).toBe(225);
  });

  it("respects precedence and parentheses", () => {
    expect(evaluateAmount("2+3*4")).toBe(14);
    expect(evaluateAmount("(2+3)*4")).toBe(20);
    expect(evaluateAmount("(100+50)/2")).toBe(75);
  });

  it("accepts x and × for multiplication, spaces, and thousands commas", () => {
    expect(evaluateAmount("450 x 3")).toBe(1350);
    expect(evaluateAmount("450×3")).toBe(1350);
    expect(evaluateAmount("1,200 + 300")).toBe(1500);
  });

  it("handles unary minus", () => {
    expect(evaluateAmount("-5+10")).toBe(5);
    expect(evaluateAmount("10*-2")).toBe(-20);
  });

  it("rejects empty, malformed and unsafe input", () => {
    for (const bad of ["", "   ", "abc", "12abc", "1+", "+1", "(1+2", "1+2)", "1..2", "1 2", "alert(1)", "1/0"]) {
      expect(evaluateAmount(bad)).toBeNull();
    }
  });
});

describe("isExpression", () => {
  it("is true only when there is arithmetic to do", () => {
    expect(isExpression("120+80")).toBe(true);
    expect(isExpression("450x3")).toBe(true);
    expect(isExpression("5-2")).toBe(true);
    expect(isExpression("4250")).toBe(false);
    expect(isExpression("12.5")).toBe(false);
    expect(isExpression("-5")).toBe(false);
  });
});

describe("formatEvaluated", () => {
  it("rounds to cents and drops trailing zeros", () => {
    expect(formatEvaluated(200)).toBe("200");
    expect(formatEvaluated(0.1 + 0.2)).toBe("0.3");
    expect(formatEvaluated(10 / 3)).toBe("3.33");
  });
});
