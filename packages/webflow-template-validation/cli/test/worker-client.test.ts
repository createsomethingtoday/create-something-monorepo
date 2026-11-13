import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildSubmitPayload, normalizePublishedUrl, recordValidationResult } from '../src/worker-client.ts';

describe('normalizePublishedUrl (mirrors the submission form)', () => {
	it('keeps an https *.webflow.io URL and drops the hash', () => {
		expect(normalizePublishedUrl('https://my-template.webflow.io')).toBe('https://my-template.webflow.io/');
		expect(normalizePublishedUrl('  https://my-template.webflow.io/about#team ')).toBe('https://my-template.webflow.io/about');
	});

	it('rejects a URL with a user name or a password, and never keeps a port', () => {
		expect(() => normalizePublishedUrl('https://user:pw@my-template.webflow.io/')).toThrow(/user name/);
		expect(normalizePublishedUrl('https://my-template.webflow.io:8443/')).toBe('https://my-template.webflow.io/');
	});

	it('pulls the URL out of pasted text', () => {
		expect(normalizePublishedUrl('Published at https://my-template.webflow.io/ yesterday')).toBe('https://my-template.webflow.io/');
	});

	it('rejects empty, non-https, and non-webflow.io input', () => {
		expect(() => normalizePublishedUrl('  ')).toThrow('Published URL is required.');
		expect(() => normalizePublishedUrl('http://my-template.webflow.io')).toThrow("URL must start with 'https://'.");
		expect(() => normalizePublishedUrl('https://example.com')).toThrow("URL must use a '.webflow.io' hostname.");
		expect(() => normalizePublishedUrl('not a url')).toThrow('Enter a valid published Webflow URL.');
	});
});

describe('buildSubmitPayload', () => {
	it('claims full scope and keeps only the issue fields the extension submits', () => {
		const payload = buildSubmitPayload({
			result: {
				url: '',
				success: true,
				summary: { passedCategories: 1, failedCategories: 1 },
				categories: [
					{ category: 'SEO Metadata', passed: false, issues: [{ id: 'seo.missing-title', severity: 'error', message: 'Missing title', details: { howToFix: 'Add one', pages: ['Home'], secret: 'x' } }] },
					{ category: 'Canvas Checks (Current Page)', passed: true, issues: [] }
				]
			},
			siteUrl: 'https://my-template.webflow.io/',
			checks: ['designer', 'assets', 'content', 'accessibility'],
			pageSlugsCount: 7
		});
		expect(payload).toEqual({
			url: 'https://my-template.webflow.io/',
			summary: { passedCategories: 1, failedCategories: 1 },
			categories: [
				{
					category: 'SEO Metadata',
					passed: false,
					issues: [{ id: 'seo.missing-title', severity: 'error', message: 'Missing title', howToFix: 'Add one', location: undefined, details: { pages: ['Home'], duplicates: undefined } }]
				},
				{ category: 'Canvas Checks (Current Page)', passed: true, issues: [] }
			],
			scope: { selectedChecks: ['designer', 'assets', 'content', 'accessibility'], pageScope: 'all', publishedChecks: 'full', pageSlugsCount: 7 }
		});
	});
});

describe('recordValidationResult', () => {
	const TOKEN = 'test-access-token-value';
	const params = {
		workerBase: 'https://worker.test',
		siteId: 'site 1',
		siteName: 'Fixture Site',
		siteUrl: 'https://my-template.webflow.io/',
		validationResults: { summary: {} },
		accessToken: TOKEN
	};
	const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('sends the token only in the submit body, then reads the latest result back', async () => {
		const fetchMock = vi.fn(async (url: string, _init?: RequestInit) =>
			url.endsWith('/app-validator/submit') ? json(200, { evidence: { verified: true } }) : json(200, { status: 'available', passed: false })
		);
		vi.stubGlobal('fetch', fetchMock);

		const outcome = await recordValidationResult(params);
		expect(outcome).toMatchObject({ ok: true, httpStatus: 200, status: 'available', passed: false, evidenceVerified: true });

		const [submitUrl, submitInit] = fetchMock.mock.calls[0];
		expect(submitUrl).toBe('https://worker.test/app-validator/submit');
		expect(submitInit?.method).toBe('POST');
		expect(JSON.parse(String(submitInit?.body)).evidence).toEqual({ type: 'oauth_site_access', accessToken: TOKEN });
		expect(JSON.stringify(submitInit?.headers)).not.toContain(TOKEN);

		const [latestUrl, latestInit] = fetchMock.mock.calls[1];
		expect(latestUrl).toBe('https://worker.test/app-validator/submission/latest?siteId=site%201');
		expect(`${latestUrl} ${JSON.stringify(latestInit)}`).not.toContain(TOKEN);
	});

	it('reports evidence as unverified when the worker does not confirm it', async () => {
		vi.stubGlobal('fetch', vi.fn(async (url: string) => (url.endsWith('/submit') ? json(200, {}) : json(200, { status: 'available' }))));
		expect((await recordValidationResult(params)).evidenceVerified).toBe(false);
	});

	it('returns the worker error without a token on a rejected submit', async () => {
		vi.stubGlobal('fetch', vi.fn(async () => json(403, { error: 'evidence_rejected', correlationId: 'worker-cid' })));
		const outcome = await recordValidationResult(params);
		expect(outcome).toEqual({ ok: false, httpStatus: 403, evidenceVerified: false, correlationId: 'worker-cid', error: 'evidence_rejected' });
		expect(JSON.stringify(outcome)).not.toContain(TOKEN);
	});

	it('returns a failure instead of throwing when the network is down', async () => {
		vi.stubGlobal('fetch', vi.fn(async () => {
			throw new TypeError('fetch failed');
		}));
		expect(await recordValidationResult(params)).toMatchObject({ ok: false, evidenceVerified: false, error: 'fetch failed' });
	});
});
