export interface KeyInfo {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
}

export type ShortcutAction =
  | "palette"
  | "new"
  | "go:day"
  | "go:month"
  | "go:ledger"
  | "go:trends"
  | "go:settings"
  | "help"
  | "prev"
  | "next"
  | "today"
  | "search";

export interface ShortcutResult {
  action: ShortcutAction | null;
  /** Whether the "g" prefix is armed after this key. */
  pendingG: boolean;
  preventDefault: boolean;
}

const GO_KEYS: Record<string, ShortcutAction> = {
  d: "go:day",
  m: "go:month",
  l: "go:ledger",
  t: "go:trends",
  s: "go:settings",
};

const SIMPLE_KEYS: Record<string, ShortcutAction> = {
  n: "new",
  t: "today",
  "/": "search",
  ArrowLeft: "prev",
  ArrowRight: "next",
};

const NONE: ShortcutResult = { action: null, pendingG: false, preventDefault: false };

/** Pure key -> shortcut mapping. Whether the key was pressed while typing in a
 *  field is the caller's concern (only the palette shortcut should work there). */
export function resolveShortcut(pendingG: boolean, e: KeyInfo): ShortcutResult {
  if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === "k") {
    return { action: "palette", pendingG: false, preventDefault: true };
  }

  if (e.key === "?" && !e.ctrlKey && !e.metaKey && !e.altKey) {
    return { action: "help", pendingG: false, preventDefault: true };
  }

  if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey) return NONE;

  if (pendingG) {
    const action = GO_KEYS[e.key];
    return action
      ? { action, pendingG: false, preventDefault: true }
      : NONE;
  }

  if (e.key === "g") return { action: null, pendingG: true, preventDefault: false };
  const action = SIMPLE_KEYS[e.key];
  return action ? { action, pendingG: false, preventDefault: true } : NONE;
}
