import { useSyncExternalStore } from "react";

const KEY = "hisaab:privacy-mode";
const listeners = new Set<() => void>();

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

/** Mirror the setting onto <html> so CSS can blur amounts everywhere at once. */
function apply(on: boolean) {
  if (typeof document === "undefined") return;
  if (on) document.documentElement.setAttribute("data-privacy", "on");
  else document.documentElement.removeAttribute("data-privacy");
}

/** Call once at startup so there is no flash of visible amounts on reload. */
export function initPrivacyMode(): void {
  apply(read());
}

export function setPrivacyMode(on: boolean): void {
  try {
    localStorage.setItem(KEY, on ? "1" : "0");
  } catch {
    /* not persisted, but still applies for this visit */
  }
  apply(on);
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Whether amounts are hidden, and a way to toggle. */
export function usePrivacyMode(): { hidden: boolean; toggle: () => void } {
  const hidden = useSyncExternalStore(subscribe, read, () => false);
  return { hidden, toggle: () => setPrivacyMode(!read()) };
}
