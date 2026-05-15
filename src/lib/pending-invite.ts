// Single source of truth for the pending-invite token in sessionStorage.
// Centralizing the key prevents typos and makes the lifecycle searchable.
//
// Lifecycle:
//   - SET on /invite/:token route when the user is signed out
//   - READ + CLEAR in AuthPage after successful sign-in/sign-up
//   - CLEAR on sign-out (defensive, in case user abandons mid-flow)
//   - CLEAR on landing page mount (defensive sweep)
//   - CLEAR after successful or failed accept on /invite/:token

const KEY = "hisaab.pending_invite_token";

export function setPendingInvite(token: string): void {
  try {
    sessionStorage.setItem(KEY, token);
  } catch {
    // sessionStorage can throw in private-browsing edge cases on some
    // browsers. Silently swallow — the worst case is the user has to
    // click the link again after signing in.
  }
}

export function getPendingInvite(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function clearPendingInvite(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // See above.
  }
}