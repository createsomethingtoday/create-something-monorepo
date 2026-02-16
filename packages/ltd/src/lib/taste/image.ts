const ALLOWED_IMAGE_HOSTS = new Set(['images.are.na', 'd2w9rnfcy7mm78.cloudfront.net']);

export interface TasteImageProxyOptions {
	width?: number;
	quality?: number;
	dpr?: number;
	anim?: boolean;
}

function clampInteger(value: number | undefined, min: number, max: number): number | undefined {
	if (value === undefined || !Number.isFinite(value)) {
		return undefined;
	}

	return Math.min(max, Math.max(min, Math.round(value)));
}

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

/**
 * Build a local proxy URL for taste images with optional sizing/compression hints.
 */
export function toTasteImageProxyUrlWithOptions(
	imageUrl?: string | null,
	options?: TasteImageProxyOptions
): string | null {
	if (!imageUrl) {
		return null;
	}

	const normalized = normalizeArenaImageUrl(imageUrl);
	if (!normalized) {
		return null;
	}

	const width = clampInteger(options?.width, 240, 2400);
	const quality = clampInteger(options?.quality, 40, 90);
	const dpr = clampInteger(options?.dpr, 1, 3);

	const params = new URLSearchParams({ url: normalized });
	if (width !== undefined) {
		params.set('w', String(width));
	}
	if (quality !== undefined) {
		params.set('q', String(quality));
	}
	if (dpr !== undefined) {
		params.set('dpr', String(dpr));
	}
	if (options?.anim !== undefined) {
		params.set('anim', options.anim ? '1' : '0');
	}

	return `/api/taste/image?${params.toString()}`;
}

/**
 * Build a responsive srcset through the local proxy.
 */
export function toTasteImageSrcSet(
	imageUrl: string | undefined | null,
	widths: readonly number[],
	options?: Omit<TasteImageProxyOptions, 'width'>
): string | null {
	if (!imageUrl || widths.length === 0) {
		return null;
	}

	const candidates = widths
		.map((width) => {
			const url = toTasteImageProxyUrlWithOptions(imageUrl, { ...options, width });
			return url ? `${url} ${width}w` : null;
		})
		.filter((candidate): candidate is string => candidate !== null);

	return candidates.length > 0 ? candidates.join(', ') : null;
}
