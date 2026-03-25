import { describe, expect, it } from 'vitest';

import { cleanMarketplaceStatus, cleanMarketplaceType, resolveAssetType } from './airtable';

describe('cleanMarketplaceType', () => {
	it('normalizes template-like Airtable values to Template', () => {
		expect(cleanMarketplaceType('Template🏗️')).toBe('Template');
		expect(cleanMarketplaceType('template')).toBe('Template');
	});

	it('normalizes app and library Airtable values', () => {
		expect(cleanMarketplaceType('App🧩')).toBe('App');
		expect(cleanMarketplaceType('Library📚')).toBe('Library');
	});

	it('handles Airtable-style arrays and unknown values', () => {
		expect(cleanMarketplaceType(['Library📚'])).toBe('Library');
		expect(cleanMarketplaceType(undefined)).toBe('Template');
	});
});

describe('resolveAssetType', () => {
	it('prefers the text rollup over linked record ids from Airtable', () => {
		expect(
			resolveAssetType({
				'🆎Type': ['rec8UQzOkwrwQr7bf'],
				'⚙️🆎Type (Text)': 'App🖥️'
			})
		).toBe('App');

		expect(
			resolveAssetType({
				'🆎Type': ['recU07tAbkf8OjzXO'],
				'⚙️🆎Type (Text)': 'Library📚'
			})
		).toBe('Library');
	});
});

describe('cleanMarketplaceStatus', () => {
	it('removes emoji prefixes from statuses', () => {
		expect(cleanMarketplaceStatus('1️⃣🆕Upcoming')).toBe('Upcoming');
		expect(cleanMarketplaceStatus('3️⃣🚀Published')).toBe('Published');
	});
});
