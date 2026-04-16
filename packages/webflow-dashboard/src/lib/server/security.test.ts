import { describe, expect, it } from 'vitest';
import { isSecureHostedUrl, shouldEnforceTrustedApiOrigin } from './security';

describe('isSecureHostedUrl', () => {
	it('accepts secure subdomains on the allowed host', () => {
		expect(isSecureHostedUrl('https://example.webflow.io', 'webflow.io')).toBe(true);
		expect(isSecureHostedUrl('https://preview.example.webflow.io/path?q=1', 'webflow.io')).toBe(true);
	});

	it('rejects insecure or malformed urls', () => {
		expect(isSecureHostedUrl('http://example.webflow.io', 'webflow.io')).toBe(false);
		expect(isSecureHostedUrl('not-a-url', 'webflow.io')).toBe(false);
	});

	it('rejects hostname spoofing via querystrings or sibling domains', () => {
		expect(isSecureHostedUrl('https://evil.com/?target=.webflow.io', 'webflow.io', { requireSubdomain: true })).toBe(false);
		expect(isSecureHostedUrl('https://webflow.io.evil.com', 'webflow.io', { requireSubdomain: true })).toBe(false);
		expect(isSecureHostedUrl('https://webflow.io', 'webflow.io', { requireSubdomain: true })).toBe(false);
	});
});

describe('shouldEnforceTrustedApiOrigin', () => {
	it('enforces trusted origins on mutating api routes', () => {
		expect(shouldEnforceTrustedApiOrigin('/api/auth/login', 'POST')).toBe(true);
		expect(shouldEnforceTrustedApiOrigin('/api/assets/123', 'PATCH')).toBe(true);
	});

	it('skips non-mutating and exempt api routes', () => {
		expect(shouldEnforceTrustedApiOrigin('/api/assets/123', 'GET')).toBe(false);
		expect(shouldEnforceTrustedApiOrigin('/api/cron/cleanup', 'POST')).toBe(false);
		expect(shouldEnforceTrustedApiOrigin('/dashboard', 'POST')).toBe(false);
	});
});
