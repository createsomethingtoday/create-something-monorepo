const ALLOWED_IMAGE_HOSTS = new Set(['images.are.na', 'd2w9rnfcy7mm78.cloudfront.net']);

/**
 * Normalize and validate external image URLs before proxying.
 * Restricts sources to known Are.na image hosts.
 */
export function normalizeArenaImageUrl(imageUrl: string): string | null {
	try {
		const parsed = new URL(imageUrl);

		// Some historic URLs may be http - force https to avoid mixed-content failures.
		if (parsed.protocol === 'http:') {
			parsed.protocol = 'https:';
		}

		if (parsed.protocol !== 'https:') {
			return null;
		}

		if (!ALLOWED_IMAGE_HOSTS.has(parsed.hostname)) {
			return null;
		}

		return parsed.toString();
	} catch {
		return null;
	}
}

/**
 * Build a local proxy URL for taste images.
 */
export function toTasteImageProxyUrl(imageUrl?: string | null): string | null {
	if (!imageUrl) {
		return null;
	}

	const normalized = normalizeArenaImageUrl(imageUrl);
	if (!normalized) {
		return null;
	}

	return `/api/taste/image?url=${encodeURIComponent(normalized)}`;
}
