interface InitialsInput {
  displayName?: string | null;
  email?: string | null;
}

/**
 * Pick a single-letter initial for avatar display.
 * Prefers display name (first non-whitespace letter), falls back to email,
 * falls back to "?" if neither yields anything useful.
 */
export function getInitials({ displayName, email }: InitialsInput): string {
  const fromName = displayName?.trim()[0];
  if (fromName) return fromName.toUpperCase();

  const fromEmail = email?.[0];
  if (fromEmail) return fromEmail.toUpperCase();

  return "?";
}