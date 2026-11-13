import { createHash, randomBytes } from 'node:crypto';

/**
 * Creator API key format and lifetime rules.
 *
 * The format and hash match the keys the original Next.js dashboard issued
 * (`wf_live_` + 32 hex, SHA-256 hex at rest), so those keys keep validating.
 * Only the hash is stored; the full key is shown to the creator once.
 */

export const API_KEY_SCOPES = ['read:assets', 'read:profile'] as const;
export type ApiKeyScope = (typeof API_KEY_SCOPES)[number];

export const API_KEY_PREFIX = 'wf_live_';
/** Characters of the key kept in clear text so a creator can tell keys apart. */
export const API_KEY_DISPLAY_PREFIX_LENGTH = 16;
export const API_KEY_LIFETIME_DAYS = 365;
/** Active keys one creator may hold at a time. */
export const MAX_ACTIVE_API_KEYS = 10;
export const API_KEY_NAME_MAX_LENGTH = 100;

const API_KEY_PATTERN = /^wf_live_[0-9a-f]{32}$/;

export function isApiKeyScope(value: unknown): value is ApiKeyScope {
	return typeof value === 'string' && (API_KEY_SCOPES as readonly string[]).includes(value);
}

export function isWellFormedApiKey(value: string): boolean {
	return API_KEY_PATTERN.test(value);
}

export function hashApiKey(key: string): string {
	return createHash('sha256').update(key).digest('hex');
}

export function generateApiKeySecret(): { key: string; hash: string; prefix: string } {
	const key = `${API_KEY_PREFIX}${randomBytes(16).toString('hex')}`;
	return { key, hash: hashApiKey(key), prefix: key.slice(0, API_KEY_DISPLAY_PREFIX_LENGTH) };
}

/** Expiration is a calendar date (YYYY-MM-DD) because Airtable stores it as one. */
export function apiKeyExpirationDate(now: Date = new Date()): string {
	const expires = new Date(now.getTime() + API_KEY_LIFETIME_DAYS * 24 * 60 * 60 * 1000);
	return expires.toISOString().slice(0, 10);
}

/**
 * A key stops working at 00:00 UTC on its expiration date. The original
 * dashboard applied the same rule, so both hosts agree on the cutoff.
 */
export function isApiKeyExpired(expirationDate: string | undefined, now: Date = new Date()): boolean {
	if (!expirationDate) return false;
	const cutoff = new Date(expirationDate);
	return Number.isNaN(cutoff.getTime()) ? true : cutoff.getTime() <= now.getTime();
}
