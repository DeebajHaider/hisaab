/** Whether the text is an arithmetic expression rather than a plain number. */
export function isExpression(text: string): boolean {
  return /[+*/×x÷()]|.-/.test(text.trim());
}

/**
 * Evaluate an amount typed as a plain number or a small sum ("120+80",
 * "450 * 3", "(100+50)/2"). Returns null for anything that isn't a finite
 * number. A hand-written parser, never eval.
 */
export function evaluateAmount(text: string): number | null {
  if (/[\d.]\s+[\d.]/.test(text)) return null; // "1 2" is a typo, not 12
  const src = text.replace(/,/g, "").replace(/[×x]/gi, "*").replace(/÷/g, "/").replace(/\s+/g, "");
  if (src === "") return null;

  let pos = 0;
  const peek = () => src[pos];

  function expr(): number | null {
    let left = term();
    while (left !== null && (peek() === "+" || peek() === "-")) {
      const op = src[pos++];
      const right = term();
      if (right === null) return null;
      left = op === "+" ? left + right : left - right;
    }
    return left;
  }

  function term(): number | null {
    let left = factor();
    while (left !== null && (peek() === "*" || peek() === "/")) {
      const op = src[pos++];
      const right = factor();
      if (right === null) return null;
      if (op === "/" && right === 0) return null;
      left = op === "*" ? left * right : left / right;
    }
    return left;
  }

  function factor(): number | null {
    if (peek() === "-") {
      pos++;
      const value = factor();
      return value === null ? null : -value;
    }
    if (peek() === "(") {
      pos++;
      const value = expr();
      if (value === null || peek() !== ")") return null;
      pos++;
      return value;
    }
    const match = /^\d*\.?\d+|^\d+\./.exec(src.slice(pos));
    if (!match) return null;
    pos += match[0].length;
    return Number(match[0]);
  }

  const result = expr();
  if (result === null || pos !== src.length || !Number.isFinite(result)) return null;
  return result;
}

/** A result as the amount field should show it: at most 2 decimals, no trailing zeros. */
export function formatEvaluated(value: number): string {
  return String(Math.round(value * 100) / 100);
}
