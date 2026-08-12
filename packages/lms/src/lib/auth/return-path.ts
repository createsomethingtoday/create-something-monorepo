const DEFAULT_LEARN_RETURN_PATH = '/paths';
const LEARN_ORIGIN = 'https://learn.createsomething.space';

export function safeLearnReturnPath(value: string | null): string {
  if (!value || value !== value.trim()) return DEFAULT_LEARN_RETURN_PATH;
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return DEFAULT_LEARN_RETURN_PATH;
  }

  try {
    const destination = new URL(value, LEARN_ORIGIN);
    if (destination.origin !== LEARN_ORIGIN) return DEFAULT_LEARN_RETURN_PATH;

    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return DEFAULT_LEARN_RETURN_PATH;
  }
}

export function labelLearnReturnPath(value: string): string {
  if (value === '/paths') return 'the course list';
  if (value === '/progress') return 'your learning progress';
  if (value === '/account') return 'your account';
  if (value.startsWith('/paths/')) return 'the lesson you requested';

  return 'the Learn page you requested';
}
