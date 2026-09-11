const IO_ORIGIN = 'https://createsomething.io';
export const DEFAULT_IO_RETURN_PATH = '/';

export function safeIoReturnPath(value: string | null): string {
	if (!value || !value.startsWith('/')) return DEFAULT_IO_RETURN_PATH;

	try {
		const destination = new URL(value, IO_ORIGIN);
		if (destination.origin !== IO_ORIGIN) return DEFAULT_IO_RETURN_PATH;
		return `${destination.pathname}${destination.search}${destination.hash}`;
	} catch {
		return DEFAULT_IO_RETURN_PATH;
	}
}
