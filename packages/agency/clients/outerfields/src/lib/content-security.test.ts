import { describe, expect, it } from 'vitest';

import { highlightTranscript, serializeJsonLd } from './content-security';

describe('stored content rendering', () => {
	it('returns transcript highlights as escaped text parts rather than HTML', () => {
		const source = '<img src=x onerror=alert(1)>Launch sequence';
		expect(highlightTranscript(source, 'launch')).toEqual([
			{ text: '<img src=x onerror=alert(1)>', highlighted: false },
			{ text: 'Launch', highlighted: true },
			{ text: ' sequence', highlighted: false }
		]);
	});

	it('serializes JSON-LD without allowing a script-closing sequence', () => {
		const title = '</script><script>alert(1)</script>';
		const serialized = serializeJsonLd({ title });

		expect(serialized).not.toContain('<');
		expect(JSON.parse(serialized)).toEqual({ title });
	});
});
