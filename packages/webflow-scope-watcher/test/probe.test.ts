import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { buildAuthorizeUrl, detectLoginPage, parseCookieHeader } from '../src/probe';

const loginSnippet = readFileSync(
	join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'login-page-snippet.html'),
	'utf-8'
);

describe('parseCookieHeader', () => {
	it('parses a raw Cookie header into Browser Rendering cookie params', () => {
		expect(parseCookieHeader('wf_sess=abc123; other=xyz')).toEqual([
			{ name: 'wf_sess', value: 'abc123', domain: '.webflow.com', path: '/' },
			{ name: 'other', value: 'xyz', domain: '.webflow.com', path: '/' },
		]);
	});

	it('preserves = inside cookie values and skips malformed pairs', () => {
		const parsed = parseCookieHeader('tok=a=b=c; ;bare; k=v');
		expect(parsed).toEqual([
			{ name: 'tok', value: 'a=b=c', domain: '.webflow.com', path: '/' },
			{ name: 'k', value: 'v', domain: '.webflow.com', path: '/' },
		]);
	});
});

describe('buildAuthorizeUrl', () => {
	it('builds a space-delimited scope param', () => {
		const url = buildAuthorizeUrl('client123', ['ai:write', 'sites:read']);
		expect(url).toBe(
			'https://webflow.com/oauth/authorize?response_type=code&client_id=client123&scope=ai%3Awrite+sites%3Aread'
		);
	});

	it('omits the scope param when no scopes are given (app defaults)', () => {
		expect(buildAuthorizeUrl('c', [])).not.toContain('scope=');
	});
});

describe('detectLoginPage', () => {
	it('detects the real webflow.com login page (fixture captured 2026-08-18)', () => {
		expect(detectLoginPage(loginSnippet)).toBe(true);
	});

	it('does not flag consent-like content', () => {
		expect(
			detectLoginPage('<h1>Authorize Scope Probe</h1><p>This app can: Read Site data</p>')
		).toBe(false);
	});
});
