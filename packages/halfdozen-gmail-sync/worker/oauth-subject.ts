export function assertOAuthSubjectMatch(requestedEmail: string, googleEmail: string): string {
  const requested = requestedEmail.trim().toLowerCase();
  const authenticated = googleEmail.trim().toLowerCase();

  if (!requested || !authenticated || requested !== authenticated) {
    throw new Error('The authenticated Google account does not match the requested mailbox');
  }

  return authenticated;
}
