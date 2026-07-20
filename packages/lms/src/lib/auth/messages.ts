export type IdentityTask = 'login' | 'signup';
export type MagicErrorType = 'expired' | 'used' | 'invalid' | 'network';

export function friendlyIdentityError(
  task: IdentityTask,
  status: number,
  _message?: string
): string {
  if (status === 429) return 'Too many attempts. Wait a moment, then try again.';
  if (status >= 500) return 'Sign-in is temporarily unavailable. Try again in a few minutes.';
  if (task === 'login' && status === 401) {
    return 'The email and password did not match. Check both and try again.';
  }
  if (task === 'signup' && status === 409) {
    return 'An account already uses this email. Sign in instead.';
  }

  return task === 'login'
    ? 'We could not sign you in. Check your details and try again.'
    : 'We could not create your account. Check your details and try again.';
}

export function friendlyMagicError(
  status: number,
  message = ''
): { type: MagicErrorType; message: string } {
  const normalized = message.toLowerCase();

  if (status >= 500) {
    return {
      type: 'network',
      message: 'We could not verify this link right now. Try again, or request a new link.'
    };
  }
  if (normalized.includes('expired')) {
    return { type: 'expired', message: 'This sign-in link has expired. Request a new one.' };
  }
  if (normalized.includes('already used') || normalized.includes('used')) {
    return { type: 'used', message: 'This sign-in link has already been used. Request a new one.' };
  }

  return { type: 'invalid', message: 'This sign-in link is not valid. Request a new one.' };
}
