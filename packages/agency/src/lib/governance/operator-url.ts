export function safeOperatorExternalHref(value: string | null | undefined): string | null {
	if (typeof value !== 'string') return null;
	const raw = value.trim();
	if (!raw) return null;

	try {
		const url = new URL(raw);
		return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
	} catch {
		return null;
	}
}
