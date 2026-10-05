/** Where Google should send the user back to after signing in: the invite
 *  they were in the middle of accepting, otherwise the app. */
export function oauthRedirectUrl(origin: string, pendingInviteToken: string | null): string {
  return pendingInviteToken ? `${origin}/invite/${pendingInviteToken}` : `${origin}/app`;
}

/** Whether the account can sign in with a password. Accounts created through
 *  Google alone have none, so password-based screens don't apply to them. */
export function hasPasswordLogin(user: {
  app_metadata?: { providers?: string[]; provider?: string };
} | null): boolean {
  const meta = user?.app_metadata;
  const providers = meta?.providers ?? (meta?.provider ? [meta.provider] : []);
  return providers.includes("email");
}
