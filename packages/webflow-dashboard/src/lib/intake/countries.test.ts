import { describe, expect, it } from 'vitest';

import { isSupportedCountry, requiresSpecificStripeOnboarding } from './countries';

describe('isSupportedCountry', () => {
	it('accepts directly supported countries', () => {
		expect(isSupportedCountry('United States')).toBe(true);
		expect(isSupportedCountry('Germany')).toBe(true);
		expect(isSupportedCountry('India')).toBe(true);
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

describe('requiresSpecificStripeOnboarding', () => {
	it('flags India and unsupported countries for the Stripe onboarding warning', () => {
		expect(requiresSpecificStripeOnboarding('India')).toBe(true);
		expect(requiresSpecificStripeOnboarding('North Korea')).toBe(true);
	});

	it('does not flag supported countries without extra onboarding guidance', () => {
		expect(requiresSpecificStripeOnboarding('United States')).toBe(false);
		expect(requiresSpecificStripeOnboarding('Germany')).toBe(false);
		expect(requiresSpecificStripeOnboarding('Antigua and Barbuda')).toBe(false);
	});

	it('returns false for blank values', () => {
		expect(requiresSpecificStripeOnboarding('')).toBe(false);
	});
});
