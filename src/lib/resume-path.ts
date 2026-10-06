import { todayISO } from "@/lib/format/date";

const DAY_PATH = /^(\/app\/budgets\/[^/]+\/day\/)\d{4}-\d{2}-\d{2}$/;
const RESUMABLE = /^\/app\/(budgets|portfolio)\/[^/]+(\/.*)?$/;

/** Whether a path is worth coming back to (a budget or portfolio page). */
export function isResumable(path: string): boolean {
  return RESUMABLE.test(path);
}

/** Where to reopen the app given the last page visited. A Day view reopens on
 *  today, not on whatever day was open. */
export function resolveResumePath(stored: string | null, today = todayISO()): string | null {
  if (!stored || !isResumable(stored)) return null;
  const day = DAY_PATH.exec(stored);
  return day ? `${day[1]}${today}` : stored;
}

const key = (userId: string) => `hisaab:last-path:${userId}`;
const RESUMED_FLAG = "hisaab:resumed";

export function saveLastPath(userId: string, path: string): void {
  if (!isResumable(path)) return;
  try {
    localStorage.setItem(key(userId), path);
  } catch {
    /* storage unavailable: resuming is a convenience, not a requirement */
  }
}

export function readLastPath(userId: string): string | null {
  try {
    return localStorage.getItem(key(userId));
  } catch {
    return null;
  }
}

/** True the first time it's called in a browser session, false afterwards, so
 *  only the launch itself resumes and later visits to the home page don't. */
export function claimResume(): boolean {
  try {
    if (sessionStorage.getItem(RESUMED_FLAG)) return false;
    sessionStorage.setItem(RESUMED_FLAG, "1");
    return true;
  } catch {
    return false;
  }
}
