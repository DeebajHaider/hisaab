import { describe, expect, it } from "vitest";
import { templateNote } from "./template-note";

describe("templateNote", () => {
  it("uses the label as the note", () => {
    expect(templateNote({ label: "Spar", notes: null })).toBe("Spar");
  });

  it("prefers the label over the template's own note", () => {
    expect(templateNote({ label: "Spar", notes: "weekly shop" })).toBe("Spar");
  });

  it("falls back to the template's note when there is no label", () => {
    expect(templateNote({ label: null, notes: "weekly shop" })).toBe("weekly shop");
    expect(templateNote({ label: "  ", notes: "weekly shop" })).toBe("weekly shop");
  });

  it("is null when neither is set", () => {
    expect(templateNote({ label: null, notes: null })).toBeNull();
    expect(templateNote({ label: "", notes: "" })).toBeNull();
  });
});
