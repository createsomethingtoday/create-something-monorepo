const CANON_ORIGIN = 'https://createsomething.ltd';
export const DEFAULT_CANON_RETURN_PATH = '/canon';

export function safeCanonReturnPath(value: string | null): string {
	if (!value || !value.startsWith('/')) return DEFAULT_CANON_RETURN_PATH;

	try {
		const destination = new URL(value, CANON_ORIGIN);
		if (destination.origin !== CANON_ORIGIN) return DEFAULT_CANON_RETURN_PATH;
		return `${destination.pathname}${destination.search}${destination.hash}`;
	} catch {
		return DEFAULT_CANON_RETURN_PATH;
	}
}
