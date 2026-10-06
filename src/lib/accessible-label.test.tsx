import { describe, expect, it } from "vitest";
import { srOnlyText } from "./accessible-label";

describe("srOnlyText", () => {
  it("reads the hidden label next to an icon", () => {
    expect(srOnlyText([<svg key="i" />, <span key="l" className="sr-only">Edit</span>])).toBe("Edit");
  });

  it("joins a label built from several parts", () => {
    expect(srOnlyText(<span className="sr-only">Edit {"Rent"}</span>)).toBe("Edit Rent");
  });

  it("finds it among other classes", () => {
    expect(srOnlyText(<span className="ml-1 sr-only">Menu</span>)).toBe("Menu");
  });

  it("is undefined when there is no hidden label", () => {
    expect(srOnlyText(<span className="text-xs">Visible</span>)).toBeUndefined();
    expect(srOnlyText("just text")).toBeUndefined();
    expect(srOnlyText(undefined)).toBeUndefined();
  });
});
