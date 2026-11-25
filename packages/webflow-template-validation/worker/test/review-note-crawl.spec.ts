import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/utils/fetch-utils', async (importOriginal) => ({
	...(await importOriginal<typeof import('../src/utils/fetch-utils')>()),
	fetchHTML: vi.fn()
}));

import { fetchHTML } from '../src/utils/fetch-utils';
import { validateContent } from '../src/validators/content-validator';

const SITE = 'https://example-template.webflow.io';
const DESCRIPTION = 'A long enough description of this page of the template, written so that the length check for meta descriptions passes with room to spare here.';

function page(body: string) {
	return `<!doctype html><html><head><title>A page title of a sensible length</title><meta name="description" content="${DESCRIPTION}"/></head>
<body><h1>Heading</h1><p>${'Body copy for the page. '.repeat(30)}</p>${body}</body></html>`;
}

/** Serves the page list through fetchHTML and answers link checks (HEAD requests) by path. */
function serve(pages: Record<string, string>, missing: string[]) {
	vi.mocked(fetchHTML).mockImplementation(async (url: string) => {
		const html = pages[new URL(url).pathname];
		if (!html) throw new Error('HTTP 404: Not Found');
		return { html, status: 200, headers: { 'content-type': 'text/html' }, size: html.length, loadTime: 0 };
	});
	const linkChecks: string[] = [];
	vi.stubGlobal(
		'fetch',
		vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
			const path = new URL(String(input)).pathname;
			if (init?.method === 'HEAD') linkChecks.push(path);
			return new Response('', { status: missing.includes(path) ? 404 : 200 });
		})
	);
	return linkChecks;
}

const PAGES = {
	'/': page('<a href="/about">About</a><a href="/services/design">Design</a><a href="/services/retired">Retired</a><a href="#" class="button w-button">Get started</a>'),
	'/about': page('<a href="/">Home</a><a href="/services/retired">Retired</a>')
};

describe('Review-note checks in the content crawl', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('asks the site for the link targets outside the page list and reports the ones that do not exist', async () => {
		const linkChecks = serve(PAGES, ['/services/retired']);
		const result = await validateContent(SITE, ['about']);

		expect(linkChecks.sort()).toEqual(['/services/design', '/services/retired']);
		const issue = result.issues.find((entry) => entry.id === 'links-internal-not-found')!;
		expect(issue.severity).toBe('warning');
		expect(issue.details?.pages).toEqual([{ url: `${SITE}/services/retired`, detail: 'linked from /, /about' }]);
		expect(result.issues.find((entry) => entry.id === 'links-placeholder-href')?.severity).toBe('warning');
	});

	it('asks for no link target on a run with a page limit', async () => {
		const linkChecks = serve(PAGES, ['/services/retired']);
		const result = await validateContent(SITE, ['about'], { maxPages: 2 });

		expect(linkChecks).toEqual([]);
		expect(result.issues.find((entry) => entry.id === 'links-internal-not-found')).toBeUndefined();
	});

	it('reads the current page only for the checks that need one page', async () => {
		const linkChecks = serve(PAGES, ['/services/retired']);
		const result = await validateContent(SITE, undefined, { pageScope: 'current', currentPageSlug: '/' });

		expect(linkChecks).toEqual([]);
		expect(result.issues.find((entry) => entry.id === 'links-placeholder-href')).toBeDefined();
	});
});
