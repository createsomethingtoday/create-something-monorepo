import { describe, expect, it } from 'vitest';

import { parseHTMLWorker } from '../src/utils/fetch-utils';

describe('parseHTMLWorker', () => {
	it('preserves empty string attribute values instead of treating them as missing', () => {
		const parsed = parseHTMLWorker('<img src="/video-poster.jpg" alt="" class="poster" />');
		const img = parsed.images[0];

		expect(img.getAttribute('alt')).toBe('');
		expect(img.hasAttribute('alt')).toBe(true);
		expect(img.getAttribute('src')).toBe('/video-poster.jpg');
	});
});
