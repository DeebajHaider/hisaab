import { afterEach, describe, expect, it, vi } from "vitest";
import { newId } from "./uuid";

const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

afterEach(() => vi.unstubAllGlobals());

describe("newId", () => {
  it("uses the native generator when available", () => {
    vi.stubGlobal("crypto", { randomUUID: () => "native-id", getRandomValues: vi.fn() });
    expect(newId()).toBe("native-id");
  });

  it("falls back to a valid v4 UUID where randomUUID is missing (insecure origins)", () => {
    vi.stubGlobal("crypto", { getRandomValues: (a: Uint8Array) => a.map((_, i) => (i * 37 + 11) % 256) });
    expect(newId()).toMatch(V4);
  });

  it("fallback ids differ from one another", () => {
    const real = globalThis.crypto;
    vi.stubGlobal("crypto", { getRandomValues: (a: Uint8Array) => real.getRandomValues(a as never) });
    const ids = new Set(Array.from({ length: 200 }, newId));
    expect(ids.size).toBe(200);
    for (const id of ids) expect(id).toMatch(V4);
  });
});
