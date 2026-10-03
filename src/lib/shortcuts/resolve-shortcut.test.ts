import { describe, expect, it } from "vitest";
import { resolveShortcut, type KeyInfo } from "./resolve-shortcut";

const key = (k: string, mods: Partial<KeyInfo> = {}): KeyInfo => ({
  key: k,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  shiftKey: false,
  ...mods,
});

describe("resolveShortcut", () => {
  it("opens the palette on Ctrl+K and Cmd+K, in either case", () => {
    for (const mods of [{ ctrlKey: true }, { metaKey: true }]) {
      for (const k of ["k", "K"]) {
        expect(resolveShortcut(false, key(k, mods))).toEqual({
          action: "palette",
          pendingG: false,
          preventDefault: true,
        });
      }
    }
  });

  it("focuses new-transaction on a bare n", () => {
    expect(resolveShortcut(false, key("n"))).toEqual({
      action: "new",
      pendingG: false,
      preventDefault: true,
    });
  });

  it("arms the g prefix without acting", () => {
    expect(resolveShortcut(false, key("g"))).toEqual({
      action: null,
      pendingG: true,
      preventDefault: false,
    });
  });

  it("completes g sequences into navigation actions and disarms", () => {
    const expected = {
      d: "go:day",
      m: "go:month",
      l: "go:ledger",
      t: "go:trends",
      s: "go:settings",
    };
    for (const [k, action] of Object.entries(expected)) {
      expect(resolveShortcut(true, key(k))).toEqual({
        action,
        pendingG: false,
        preventDefault: true,
      });
    }
  });

  it("disarms on an unrelated key after g, without acting or swallowing it", () => {
    expect(resolveShortcut(true, key("x"))).toEqual({
      action: null,
      pendingG: false,
      preventDefault: false,
    });
  });

  it("ignores n/g and sequences when Ctrl, Cmd, or Alt is held (browser shortcuts)", () => {
    for (const mods of [{ ctrlKey: true }, { metaKey: true }, { altKey: true }]) {
      expect(resolveShortcut(false, key("n", mods)).action).toBeNull();
      expect(resolveShortcut(false, key("g", mods)).pendingG).toBe(false);
      expect(resolveShortcut(true, key("d", mods)).action).toBeNull();
    }
  });

  it("ignores shifted letters (capital N is not the n shortcut)", () => {
    expect(resolveShortcut(false, key("N", { shiftKey: true })).action).toBeNull();
  });
});
