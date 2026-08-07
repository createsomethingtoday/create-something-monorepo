import { describe, expect, it } from 'vitest';
import {
	corsHeaders,
	isLikelyBot,
	parseBeacon,
	parseBeaconQuery,
	slugFromPath,
	utcDay
} from '../src/beacon';

describe('parseBeacon', () => {
	it('accepts a detail-page beacon and derives the slug from the path', () => {
		const event = parseBeacon(
			JSON.stringify({
				s: 'spoofed-slug',
				p: '/templates/html/clarix-website-template',
				r: 'https://www.google.com/search?q=webflow+template',
				u: 1
			})
		);

		expect(event).toMatchObject({
			slug: 'clarix-website-template',
			path: '/templates/html/clarix-website-template',
			referrerHost: 'www.google.com',
			newSession: true
		});
	});

	it('accepts browse-page beacons using the claimed slug', () => {
		const event = parseBeacon(
			JSON.stringify({ s: 'marketplace-browse', p: '/templates?category=portfolio', u: 0 })
		);
		expect(event).toMatchObject({ slug: 'marketplace-browse', newSession: false });
	});

	it('rejects non-marketplace paths, bad slugs, and junk', () => {
		expect(parseBeacon(JSON.stringify({ s: 'x', p: '/pricing' }))).toBeNull();
		expect(parseBeacon(JSON.stringify({ s: 'UPPER CASE!', p: '/templates' }))).toBeNull();
		expect(parseBeacon('not json')).toBeNull();
		expect(parseBeacon('null')).toBeNull();
	});

	it('tolerates malformed referrers', () => {
		const event = parseBeacon(
			JSON.stringify({ s: 'clarix', p: '/templates/html/clarix', r: 'not a url' })
		);
		expect(event?.referrerHost).toBe('');
	});
});

describe('parseBeaconQuery (script-tag transport)', () => {
	it('parses the query-string form used by the <script src> beacon', () => {
		const params = new URLSearchParams(
			's=spoofed&p=%2Ftemplates%2Fhtml%2Fclarix-website-template&r=https%3A%2F%2Fwww.google.com%2F&u=1&_=123'
		);
		expect(parseBeaconQuery(params)).toMatchObject({
			slug: 'clarix-website-template',
			referrerHost: 'www.google.com',
			newSession: true
		});
	});

	it('rejects non-marketplace query beacons', () => {
		expect(parseBeaconQuery(new URLSearchParams('s=x&p=%2Fpricing'))).toBeNull();
		expect(parseBeaconQuery(new URLSearchParams(''))).toBeNull();
	});
});

describe('slugFromPath', () => {
	it('extracts detail-page slugs with and without trailing slash', () => {
		expect(slugFromPath('/templates/html/delarose-website-template')).toBe(
			'delarose-website-template'
		);
		expect(slugFromPath('/templates/html/delarose-website-template/')).toBe(
			'delarose-website-template'
		);
	});

	it('returns null for browse pages', () => {
		expect(slugFromPath('/templates')).toBeNull();
		expect(slugFromPath('/templates/style/minimal')).toBeNull();
	});
});

describe('isLikelyBot', () => {
	it('flags crawlers and empty agents', () => {
		expect(isLikelyBot(null)).toBe(true);
		expect(isLikelyBot('Googlebot/2.1 (+http://www.google.com/bot.html)')).toBe(true);
		expect(isLikelyBot('python-requests/2.31')).toBe(true);
		expect(isLikelyBot('HeadlessChrome/126.0')).toBe(true);
	});

	it('passes normal browsers', () => {
		expect(
			isLikelyBot(
				'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'
			)
		).toBe(false);
	});
});

describe('corsHeaders', () => {
	const allowed = 'https://webflow.com,https://www.webflow.com';

	it('echoes allowed origins', () => {
		expect(corsHeaders('https://www.webflow.com', allowed)['Access-Control-Allow-Origin']).toBe(
			'https://www.webflow.com'
		);
	});

	it('falls back to the primary origin for unknown callers', () => {
		expect(corsHeaders('https://evil.example', allowed)['Access-Control-Allow-Origin']).toBe(
			'https://webflow.com'
		);
	});
});

describe('utcDay', () => {
	it('formats as YYYY-MM-DD', () => {
		expect(utcDay(new Date('2026-08-04T23:59:59Z'))).toBe('2026-08-04');
	});
});
