import { describe, expect, it } from "vitest";
import { addTag, collectTags, MAX_TAG_LENGTH, MAX_TAGS, normalizeTag, removeTag } from "./tags";

describe("normalizeTag", () => {
  it("lower-cases, trims and drops a leading #", () => {
    expect(normalizeTag("  #Trip ")).toBe("trip");
    expect(normalizeTag("##Eid  Gifts")).toBe("eid gifts");
  });

  it("caps the length", () => {
    expect(normalizeTag("x".repeat(100))).toHaveLength(MAX_TAG_LENGTH);
  });

  it("is empty for blank input", () => {
    expect(normalizeTag("   ")).toBe("");
    expect(normalizeTag("#")).toBe("");
  });
});

describe("addTag", () => {
  it("appends a normalised tag", () => {
    expect(addTag(["trip"], " #Work ")).toEqual(["trip", "work"]);
  });

  it("ignores blanks and duplicates, including ones differing in case", () => {
    expect(addTag(["trip"], "")).toEqual(["trip"]);
    expect(addTag(["trip"], "TRIP")).toEqual(["trip"]);
  });

  it("stops at the maximum", () => {
    const full = Array.from({ length: MAX_TAGS }, (_, i) => `t${i}`);
    expect(addTag(full, "one more")).toEqual(full);
  });

  it("does not mutate its input", () => {
    const tags = ["a"];
    addTag(tags, "b");
    expect(tags).toEqual(["a"]);
  });
});

describe("removeTag", () => {
  it("drops one tag", () => {
    expect(removeTag(["a", "b"], "a")).toEqual(["b"]);
  });
});

describe("collectTags", () => {
  it("counts usage across rows, most used first, ties alphabetical", () => {
    const out = collectTags([
      { tags: ["trip", "work"] },
      { tags: ["trip"] },
      { tags: ["gift"] },
      { tags: null },
      {},
    ]);
    expect(out).toEqual([
      { tag: "trip", count: 2 },
      { tag: "gift", count: 1 },
      { tag: "work", count: 1 },
    ]);
  });
});
