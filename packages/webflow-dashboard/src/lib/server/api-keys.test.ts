import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
	apiKeyExpirationDate,
	generateApiKeySecret,
	hashApiKey,
	isApiKeyExpired,
	isApiKeyScope,
	isWellFormedApiKey
} from './api-keys';

describe('API key format', () => {
	it('generates keys in the format the original dashboard issued', () => {
		const { key, hash, prefix } = generateApiKeySecret();

		expect(key).toMatch(/^wf_live_[0-9a-f]{32}$/);
		expect(key).toHaveLength(40);
		expect(prefix).toBe(key.slice(0, 16));
		// Stored hash = SHA-256 hex of the full key, the rule both hosts verify with.
		expect(hash).toBe(createHash('sha256').update(key).digest('hex'));
	});

	it('never repeats a key', () => {
		const keys = new Set(Array.from({ length: 200 }, () => generateApiKeySecret().key));
		expect(keys.size).toBe(200);
	});

	it('hashes a known key to a known value', () => {
		expect(hashApiKey('wf_live_00000000000000000000000000000000')).toBe(
			createHash('sha256').update('wf_live_00000000000000000000000000000000').digest('hex')
		);
		expect(hashApiKey('wf_live_00000000000000000000000000000000')).toHaveLength(64);
	});

	it('rejects anything that is not a well-formed key', () => {
		expect(isWellFormedApiKey('wf_live_0123456789abcdef0123456789abcdef')).toBe(true);
		expect(isWellFormedApiKey('wf_live_0123456789ABCDEF0123456789ABCDEF')).toBe(false);
		expect(isWellFormedApiKey('wf_live_0123')).toBe(false);
		expect(isWellFormedApiKey('wfd_0123456789abcdef0123456789abcdef')).toBe(false);
		expect(isWellFormedApiKey("wf_live_0123456789abcdef0123456789abcde'")).toBe(false);
		expect(isWellFormedApiKey('')).toBe(false);
	});

	it('accepts only the scopes the API serves', () => {
		expect(isApiKeyScope('read:assets')).toBe(true);
		expect(isApiKeyScope('read:profile')).toBe(true);
		expect(isApiKeyScope('write:assets')).toBe(false);
		expect(isApiKeyScope(undefined)).toBe(false);
	});
});

describe('API key expiry', () => {
	it('sets expiry one year out, as a calendar date', () => {
		expect(apiKeyExpirationDate(new Date('2026-11-13T19:00:00Z'))).toBe('2027-11-13');
	});

	it('expires a key at 00:00 UTC on its expiration date', () => {
		expect(isApiKeyExpired('2026-11-14', new Date('2026-11-13T23:59:59Z'))).toBe(false);
		expect(isApiKeyExpired('2026-11-14', new Date('2026-11-14T00:00:00Z'))).toBe(true);
	});

	it('treats a missing date as no expiry and an unreadable date as expired', () => {
		expect(isApiKeyExpired(undefined)).toBe(false);
		expect(isApiKeyExpired('not-a-date')).toBe(true);
	});
});
