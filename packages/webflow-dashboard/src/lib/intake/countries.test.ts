import { describe, expect, it } from 'vitest';

import { isSupportedCountry } from './countries';

describe('isSupportedCountry', () => {
	it('accepts directly supported countries', () => {
		expect(isSupportedCountry('United States')).toBe(true);
		expect(isSupportedCountry('Germany')).toBe(true);
	});

	it('normalizes common aliases from the live form', () => {
		expect(isSupportedCountry('Antigua and Barbuda')).toBe(true);
		expect(isSupportedCountry('The Bahamas')).toBe(true);
		expect(isSupportedCountry('Macedonia')).toBe(true);
	});

	it('returns false for unsupported or blank values', () => {
		expect(isSupportedCountry('')).toBe(false);
		expect(isSupportedCountry('North Korea')).toBe(false);
	});
});
