import { describe, expect, it } from "vitest";
import { containsPattern } from "./like-pattern";

describe("containsPattern", () => {
  it("wraps text so it matches anywhere in the field", () => {
    expect(containsPattern("builder")).toBe("%builder%");
  });

  it("trims surrounding whitespace but keeps inner spaces", () => {
    expect(containsPattern("  builder treat ")).toBe("%builder treat%");
  });

  it("treats LIKE wildcards in the input as literal characters", () => {
    expect(containsPattern("50%")).toBe("%50\\%%");
    expect(containsPattern("a_b")).toBe("%a\\_b%");
  });

  it("escapes the escape character itself", () => {
    expect(containsPattern("a\\b")).toBe("%a\\\\b%");
  });

  it("returns null for blank input so callers skip the filter", () => {
    expect(containsPattern("")).toBeNull();
    expect(containsPattern("   ")).toBeNull();
  });
});
