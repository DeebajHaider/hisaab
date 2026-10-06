import type { ShortcutAction } from "./resolve-shortcut";

export interface ShortcutEntry {
  keys: string[];
  label: string;
}

export interface ShortcutGroup {
  heading: string;
  items: ShortcutEntry[];
}

export type ShortcutPage = "day" | "month" | "ledger" | "budget" | "other";

/** Which kind of page a path is, as far as shortcuts are concerned. */
export function shortcutPage(pathname: string): ShortcutPage {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] !== "app" || parts[1] !== "budgets" || !parts[2]) return "other";
  switch (parts[3]) {
    case "day":
      return "day";
    case "month":
      return "month";
    case "ledger":
      return "ledger";
    default:
      return "budget";
  }
}

/** Whether a resolved shortcut does anything on this page. Keys that don't
 *  apply are left alone so the browser keeps them (arrow-key scrolling, etc.). */
export function isShortcutAvailable(action: ShortcutAction, page: ShortcutPage): boolean {
  switch (action) {
    case "palette":
    case "help":
      return true;
    case "prev":
    case "next":
      return page === "day" || page === "month";
    case "today":
      return page === "day" || page === "month";
    case "search":
      return page === "ledger";
    default:
      // new / go:* only make sense inside a budget.
      return page !== "other";
  }
}

const GLOBAL: ShortcutGroup = {
  heading: "Anywhere",
  items: [
    { keys: ["Ctrl", "K"], label: "Open the command palette" },
    { keys: ["?"], label: "Show these shortcuts" },
  ],
};

const IN_BUDGET: ShortcutGroup = {
  heading: "In a budget",
  items: [
    { keys: ["N"], label: "New transaction" },
    { keys: ["G", "D"], label: "Go to Day view" },
    { keys: ["G", "M"], label: "Go to Month" },
    { keys: ["G", "L"], label: "Go to Ledger" },
    { keys: ["G", "T"], label: "Go to Trends" },
    { keys: ["G", "S"], label: "Go to Budget settings" },
  ],
};

const PAGE_GROUPS: Partial<Record<ShortcutPage, ShortcutGroup>> = {
  day: {
    heading: "On this page",
    items: [
      { keys: ["←"], label: "Previous day" },
      { keys: ["→"], label: "Next day" },
      { keys: ["T"], label: "Jump to today" },
    ],
  },
  month: {
    heading: "On this page",
    items: [
      { keys: ["←"], label: "Previous month" },
      { keys: ["→"], label: "Next month" },
      { keys: ["T"], label: "Jump to this month" },
    ],
  },
  ledger: {
    heading: "On this page",
    items: [{ keys: ["/"], label: "Search notes" }],
  },
};

/** The shortcuts to list for a path: the page's own first, then the rest. */
export function shortcutsForPath(pathname: string): ShortcutGroup[] {
  const page = shortcutPage(pathname);
  const groups: ShortcutGroup[] = [];
  const own = PAGE_GROUPS[page];
  if (own) groups.push(own);
  if (page !== "other") groups.push(IN_BUDGET);
  groups.push(GLOBAL);
  return groups;
}
